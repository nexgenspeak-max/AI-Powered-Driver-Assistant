import Foundation
import Observation
import os
import UIKit

/// Shared app state: session, `me`, driver context, settings and earnings — the native
/// counterpart of the RN zustand stores + React Query caches. Injected through the environment.
@MainActor
@Observable
final class AppModel {
    enum Phase: Equatable { case launching, signedOut, signedIn }

    private(set) var phase: Phase = .launching
    private(set) var me: AuthUser?
    /// `/auth/me` failed and there is no profile yet; a background retry is running.
    private(set) var meError = false
    private(set) var context: DriverContext?
    private(set) var contextError = false
    private(set) var contextLoading = false
    private(set) var settings: AccountSettings?
    private(set) var settingsError = false
    private(set) var earnings: [String: EarningsSummary] = [:]
    private(set) var earningsError: Set<String> = []
    /// `tripOfferStore.tripId`.
    var offerTripId: String?
    /// Bumped by `trip-offer` invalidations so the open sheet refetches.
    private(set) var offerRefreshToken = 0

    let config: AppConfig
    let auth: AuthAPI
    let api: DriverAPI
    let session: AuthSession
    let prefs: Preferences
    let chat: ChatStore
    let voice: VoiceSession
    let location: LocationTracker
    let audio: FillerAudio
    let navigation: TurnByTurn
    @ObservationIgnored let socket: DispatchSocket
    @ObservationIgnored private var knownActiveIds: Set<String> = []
    @ObservationIgnored private var nudgeTriggered = false
    @ObservationIgnored private var logoutWatcher: Task<Void, Never>?
    @ObservationIgnored private var socketPhone: String?
    /// Bumped by logout / sign-out. A request captures it before its first await and drops its
    /// result when it changed (a response that lands after logout must not resurrect the session).
    @ObservationIgnored private var sessionGeneration = 0
    /// Retries `/auth/me` while signed in without a profile (React Query's retry/refetch in RN).
    @ObservationIgnored private var meRetryTask: Task<Void, Never>?
    @ObservationIgnored private let meRetryBase: Duration
    @ObservationIgnored private let logoutOfflineTimeout: Duration
    @ObservationIgnored private let log = Logger(subsystem: "com.chinhtruongba.driverapp", category: "app")

    init(config: AppConfig, auth: AuthAPI, api: DriverAPI, session: AuthSession, prefs: Preferences,
         voiceEngine: VoiceEngine, socket: DispatchSocket, audio: FillerAudio,
         meRetryBase: Duration = .seconds(2), logoutOfflineTimeout: Duration = .seconds(3)) {
        self.meRetryBase = meRetryBase
        self.logoutOfflineTimeout = logoutOfflineTimeout
        self.config = config
        self.auth = auth
        self.api = api
        self.session = session
        self.prefs = prefs
        self.audio = audio
        self.chat = ChatStore()
        self.voice = config.launch.demo
            ? VoiceSession(engine: voiceEngine, api: api, prefs: prefs, audio: audio, requestMicPermission: { true })
            : VoiceSession(engine: voiceEngine, api: api, prefs: prefs, audio: audio, listenOnly: VoiceSession.micUnavailable)
        self.location = LocationTracker(api: api, demo: config.launch.demo)
        self.socket = socket
        self.navigation = TurnByTurn(api: api)
        voice.onMessage = { [weak self] text, who, isFinal, segmentId in
            self?.chat.upsert(who: who, msg: text, isFinal: isFinal, segmentId: segmentId)
        }
        location.isOnline = { [weak self] in self?.isOnline ?? false }
        location.activeStops = { [weak self] in self?.activeStopCoordinates ?? [] }
        socket.onEvent = { [weak self] event in self?.handle(event) }
        logoutWatcher = Task { [weak self, session] in
            for await _ in await session.logoutEvents() { self?.resetToSignedOut() }
        }
    }

    // MARK: Derived

    var isOnline: Bool { me?.isOnline ?? false }
    var phone: String? { me?.phone }

    var pendingTrips: [Trip] { (context?.upcomingTrips ?? []).filter { TripStatus.pendingSet.contains($0.status) } }

    var activeStopCoordinates: [LatLng] {
        if let stops = context?.optimizedRoute?.stops, !stops.isEmpty { return stops.map(\.coordinate) }
        return (context?.activeTrips ?? []).compactMap { $0.status == .pickedUp ? $0.dropoff : $0.pickup }
    }

    // MARK: Session

    func bootstrap() async {
        if await session.accessToken == nil { phase = .signedOut; return }
        phase = .signedIn
        await loadContext() // loads `me` first
        startLocation()
    }

    func login(phone: String, password: String) async throws {
        let generation = sessionGeneration
        let tokens = try await auth.login(phone: phone, password: password)
        // A session reset that landed while the request was in flight wins: do not sign back in.
        guard generation == sessionGeneration else { throw CancellationError() }
        let switching = phase == .signedIn
        if switching { await session.clear() }
        await session.setTokens(tokens)
        // Signing in over a live session (debug dev-login): drop the previous account's profile,
        // phone header, socket, context and settings before the new one loads. No await between
        // the reset and `phase = .signedIn`, so the auth screens never flash.
        if switching { resetToSignedOut() }
        phase = .signedIn
        await loadContext() // loads `me` first
        startLocation()
    }

    func register(_ input: RegisterInput) async throws {
        let generation = sessionGeneration // before the await, so a reset in between is seen
        let res = try await auth.register(input)
        guard generation == sessionGeneration else { throw CancellationError() }
        await session.setTokens(AuthTokens(accessToken: res.accessToken, refreshToken: res.refreshToken))
        if let user = res.user { await setMe(user, generation: generation) }
        phase = .signedIn
        await loadContext() // loads `me` first when the response carried no user
        startLocation()
    }

    /// Offline PATCH (errors ignored, capped at `logoutOfflineTimeout`), then wipe tokens and caches.
    func logout() async {
        sessionGeneration += 1 // anything still in flight belongs to the old session
        if let phone {
            // The PATCH must not hold the sign-out hostage on a dead link: whichever finishes
            // first (the request or the timer) ends the wait and cancels the other.
            await withTaskGroup(of: Void.self) { [api, logoutOfflineTimeout] group in
                group.addTask { try? await api.setStatus(phone: phone, online: false) }
                group.addTask { try? await Task.sleep(for: logoutOfflineTimeout) }
                _ = await group.next()
                group.cancelAll()
            }
        }
        await session.clear()
        resetToSignedOut()
    }

    private func resetToSignedOut() {
        sessionGeneration += 1
        meRetryTask?.cancel()
        meRetryTask = nil
        meError = false
        contextError = false
        settingsError = false
        earningsError = []
        voice.disconnect()
        socket.stop()
        socketPhone = nil
        navigation.stop()
        location.setBackgroundTracking(false)
        location.stopForeground()
        me = nil
        context = nil
        settings = nil
        earnings = [:]
        chat.clear()
        chat.closePanel()
        offerTripId = nil
        knownActiveIds = []
        phase = .signedOut
    }

    /// Applies a `/me`-shaped response only if it belongs to the current session (`generation`
    /// captured before the request); re-checked after the phone write so a logout during it wins.
    private func setMe(_ user: AuthUser, generation: Int) async {
        guard generation == sessionGeneration else { return }
        me = user
        await session.setDriverPhone(user.phone)
        guard generation == sessionGeneration else {
            await session.setDriverPhone(me?.phone) // undo our write: nil once signed out
            return
        }
        syncOnlineSideEffects()
    }

    /// Loads `/auth/me`. On failure without a profile it raises `meError` and keeps retrying in
    /// the background (2 s → 4 → 8 … ≤ 30 s) until it succeeds or the session ends.
    func loadMe() async {
        let generation = sessionGeneration
        if me == nil { meError = false } // a manual retry shows the loading state again
        guard await fetchMe(fromRetry: false) == false else { return }
        guard generation == sessionGeneration, phase == .signedIn, me == nil else { return }
        scheduleMeRetry()
    }

    /// One `/auth/me` attempt. `true` = applied; `false` = failed; `nil` = the session changed meanwhile.
    private func fetchMe(fromRetry: Bool) async -> Bool? {
        let generation = sessionGeneration
        do {
            let user = try await auth.me()
            guard generation == sessionGeneration else { return nil }
            meError = false
            if !fromRetry {
                // Loaded elsewhere (e.g. "Thử lại"): the background retry has nothing left to do.
                meRetryTask?.cancel()
                meRetryTask = nil
            }
            await setMe(user, generation: generation)
            return generation == sessionGeneration ? true : nil
        } catch {
            guard generation == sessionGeneration else { return nil }
            log.notice("me failed")
            if me == nil { meError = true }
            return false
        }
    }

    nonisolated static func meRetryDelay(attempt: Int, base: Duration, max: Duration = .seconds(30)) -> Duration {
        let factor = 1 << Swift.min(Swift.max(attempt - 1, 0), 10)
        return Swift.min(base * factor, max)
    }

    private func scheduleMeRetry() {
        guard meRetryTask == nil else { return }
        let generation = sessionGeneration
        meRetryTask = Task { [weak self, base = meRetryBase] in
            var attempt = 1
            while !Task.isCancelled {
                try? await Task.sleep(for: AppModel.meRetryDelay(attempt: attempt, base: base))
                guard !Task.isCancelled, let self, generation == self.sessionGeneration,
                      self.phase == .signedIn, self.me == nil else { break }
                if await self.fetchMe(fromRetry: true) != false { break }
                attempt += 1
            }
            guard !Task.isCancelled, let self, generation == self.sessionGeneration else { return }
            self.meRetryTask = nil
            // The profile arrived: everything gated on it (context, socket, tracking) can load now.
            if self.me != nil, self.context == nil { await self.loadContext() }
        }
    }

    private func startLocation() {
        guard phase == .signedIn else { return } // signed out while the profile was loading
        location.startForeground()
    }

    // MARK: Driver context

    func loadContext(fresh: Bool = false) async {
        guard phase == .signedIn else { return }
        // `useDriverContext` is `enabled: !!driver`: the context request needs the driver phone.
        if me == nil {
            await loadMe()
            guard me != nil, phase == .signedIn else { return }
        }
        let generation = sessionGeneration
        contextLoading = true
        defer { contextLoading = false }
        do {
            let ctx = try await api.context(fresh: fresh)
            guard generation == sessionGeneration else { return }
            contextError = false
            apply(ctx)
        } catch APIError.cancelled {
        } catch {
            guard generation == sessionGeneration else { return }
            contextError = true
        }
    }

    private func apply(_ ctx: DriverContext) {
        let newIds = Set(ctx.activeTrips.map(\.tripId))
        let appeared = !knownActiveIds.isEmpty || context != nil ? newIds.subtracting(knownActiveIds) : []
        knownActiveIds = newIds
        context = ctx
        if !appeared.isEmpty { Task { await location.pushImmediate() } } // usePushLocationOnNewTrip
        if navigation.isNavigating {
            // Turn-by-turn follows the next stop: re-route when it changes, stop when it is gone.
            let target = NextStop.from(ctx)?.coordinate
            Task { await navigation.retarget(to: target, from: location.current) }
        }
        autoConnectOnNudge()
    }

    /// `useAutoConnectOnNudge`: open the panel and connect while idle, once per nudge. Evaluated
    /// on every context load and on every voice status change (the hook has `status` in its deps).
    func autoConnectOnNudge() {
        guard context?.hasPendingNudge == true, let phone else { nudgeTriggered = false; return }
        guard !nudgeTriggered, voice.status == .idle else { return }
        nudgeTriggered = true
        chat.openPanel()
        Task { await voice.connect(phone: phone) }
    }

    // MARK: Online toggle (optimistic)

    func setOnline(_ online: Bool) async {
        guard var user = me, let phone = user.phone else { return }
        let previousStatus = user.status
        let generation = sessionGeneration
        user.status = online ? "online" : "offline"
        me = user
        syncOnlineSideEffects()
        do {
            try await api.setStatus(phone: phone, online: online)
            guard generation == sessionGeneration else { return }
            Haptics.success()
            await loadContext()
        } catch {
            // A failure that lands after logout must not restore `me` or restart the socket.
            guard generation == sessionGeneration, var current = me else { return }
            current.status = previousStatus
            me = current
            syncOnlineSideEffects()
            Haptics.error()
        }
    }

    private func syncOnlineSideEffects() {
        let phone = me?.phone
        if isOnline, let phone {
            if socketPhone != phone {
                socketPhone = phone
                socket.start(phone: phone)
            }
            location.setBackgroundTracking(true)
        } else {
            if socketPhone != nil { socket.stop(); socketPhone = nil }
            location.setBackgroundTracking(false)
        }
    }

    private func handle(_ event: DispatchEvent) {
        switch event {
        case .opened:
            offerRefreshToken += 1
            Task { await loadContext() }
        case let .tripOffer(id):
            Task { await loadContext() }
            offerTripId = id
        case .tripConfirmed:
            Task { await location.pushImmediate() }
        case .invalidate:
            offerRefreshToken += 1
            Task { await loadContext() }
        }
    }

    // MARK: Trips

    func acceptTrip(_ id: String) async throws {
        async let push: Void = location.pushImmediate()
        async let patch = api.updateTrip(id: id, status: .confirmed, at: nil)
        _ = await push
        _ = try await patch
        Haptics.success() // TripCard.tsx / TripOfferSheet.tsx onSuccess
        await loadContext()
    }

    func rejectTrip(_ id: String) async throws {
        _ = try await api.updateTrip(id: id, status: .rejected, at: nil)
        await loadContext()
    }

    func cancelTrip(_ id: String) async throws {
        _ = try await api.updateTrip(id: id, status: .cancelledByDriver, at: nil)
        await loadContext()
    }

    /// Arrival actions read a fresh GPS fix first; 409 carries the server `detail`.
    func advance(_ trip: Trip) async throws {
        let next: TripStatus
        switch trip.status {
        case .confirmed: next = .arrivedPickup
        case .arrivedPickup: next = .pickedUp
        case .pickedUp: next = .completed
        default: return
        }
        let fix = await location.freshFix()
        _ = try await api.updateTrip(id: trip.tripId, status: next, at: fix)
        if next == .completed { Haptics.success() } // ActiveTripCard.tsx complete onSuccess
        await loadContext()
    }

    func createTrip(_ input: CreateTripInput) async throws {
        _ = try await api.createTrip(input)
        await loadContext()
    }

    func fetchTrip(_ id: String) async throws -> Trip { try await api.trip(id: id) }

    // MARK: Profile

    func updateName(_ name: String) async throws {
        guard let id = me?.id else { return }
        let generation = sessionGeneration
        await setMe(try await auth.updateAccount(id: id, name: name), generation: generation)
    }

    func updateVehicle(type: String, plate: String, name: String) async throws {
        guard let id = me?.id else { return }
        let generation = sessionGeneration
        await setMe(try await auth.updateVehicle(id: id, type: type, plate: plate, name: name), generation: generation)
        guard generation == sessionGeneration else { return }
        await loadContext()
    }

    // MARK: Settings (optimistic with rollback)

    func loadSettings() async {
        guard let id = me?.id else { return }
        let generation = sessionGeneration
        do {
            let s = try await auth.settings(accountId: id)
            guard generation == sessionGeneration else { return }
            settings = s
            settingsError = false
            prefs.wakeWordEnabled = s.handsFreeMode
        } catch {
            guard generation == sessionGeneration else { return }
            settingsError = true
        }
    }

    func patchSettings(_ patch: AccountSettingsPatch) async {
        guard let id = me?.id, let previous = settings else { return }
        let generation = sessionGeneration
        settings = patch.applied(to: previous)
        if let hf = patch.handsFreeMode { prefs.wakeWordEnabled = hf }
        if patch.notifyOnPickupApproach == true || patch.notifyOnPickupApproachRadiusM != nil {
            Task { await location.pushImmediate(scope: "notify") }
        }
        if patch.autoSuggestNextStop == true { Task { await location.pushImmediate(scope: "suggest") } }
        do {
            let saved = try await auth.patchSettings(accountId: id, patch)
            guard generation == sessionGeneration else { return }
            settings = saved
        } catch {
            // After logout neither the settings nor the wake-word preference may come back.
            guard generation == sessionGeneration else { return }
            settings = previous
            prefs.wakeWordEnabled = previous.handsFreeMode
            Haptics.error()
        }
    }

    // MARK: Earnings

    func loadEarnings(_ period: String) async {
        guard phase == .signedIn else { return }
        let generation = sessionGeneration
        do {
            let summary = try await api.earningsSummary(period: period)
            guard generation == sessionGeneration else { return } // not the previous account's totals
            earnings[period] = summary
            earningsError.remove(period)
        } catch {
            guard generation == sessionGeneration else { return }
            earningsError.insert(period)
        }
    }
}

enum Haptics {
    @MainActor static func success() { UINotificationFeedbackGenerator().notificationOccurred(.success) }
    @MainActor static func warning() { UINotificationFeedbackGenerator().notificationOccurred(.warning) }
    @MainActor static func error() { UINotificationFeedbackGenerator().notificationOccurred(.error) }
}
