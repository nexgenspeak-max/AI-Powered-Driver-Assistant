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
    @ObservationIgnored private let log = Logger(subsystem: "com.chinhtruongba.driverapp", category: "app")

    init(config: AppConfig, auth: AuthAPI, api: DriverAPI, session: AuthSession, prefs: Preferences,
         voiceEngine: VoiceEngine, socket: DispatchSocket, audio: FillerAudio) {
        self.config = config
        self.auth = auth
        self.api = api
        self.session = session
        self.prefs = prefs
        self.audio = audio
        self.chat = ChatStore()
        self.voice = VoiceSession(engine: voiceEngine, api: api, prefs: prefs, audio: audio, asksMicPermission: !config.launch.demo)
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
        await loadMe()
        await loadContext()
        startLocation()
    }

    func login(phone: String, password: String) async throws {
        let tokens = try await auth.login(phone: phone, password: password)
        await session.setTokens(tokens)
        phase = .signedIn
        await loadMe()
        await loadContext()
        startLocation()
    }

    func register(_ input: RegisterInput) async throws {
        let res = try await auth.register(input)
        await session.setTokens(AuthTokens(accessToken: res.accessToken, refreshToken: res.refreshToken))
        if let user = res.user { await setMe(user) }
        phase = .signedIn
        if me == nil { await loadMe() }
        await loadContext()
        startLocation()
    }

    /// Offline PATCH (errors ignored), then wipe tokens and caches.
    func logout() async {
        if let phone { try? await api.setStatus(phone: phone, online: false) }
        await session.clear()
        resetToSignedOut()
    }

    private func resetToSignedOut() {
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

    private func setMe(_ user: AuthUser) async {
        me = user
        await session.setDriverPhone(user.phone)
        syncOnlineSideEffects()
    }

    func loadMe() async {
        do { await setMe(try await auth.me()) } catch { log.notice("me failed") }
    }

    private func startLocation() {
        location.startForeground()
    }

    // MARK: Driver context

    func loadContext(fresh: Bool = false) async {
        guard phase == .signedIn else { return }
        contextLoading = true
        defer { contextLoading = false }
        do {
            let ctx = try await api.context(fresh: fresh)
            contextError = false
            apply(ctx)
        } catch APIError.cancelled {
        } catch {
            contextError = true
        }
    }

    private func apply(_ ctx: DriverContext) {
        let newIds = Set(ctx.activeTrips.map(\.tripId))
        let appeared = !knownActiveIds.isEmpty || context != nil ? newIds.subtracting(knownActiveIds) : []
        knownActiveIds = newIds
        context = ctx
        if !appeared.isEmpty { Task { await location.pushImmediate() } } // usePushLocationOnNewTrip
        autoConnectOnNudge()
    }

    /// `useAutoConnectOnNudge`: open the panel and connect while idle, once per nudge.
    private func autoConnectOnNudge() {
        guard context?.hasPendingNudge == true, let phone else { nudgeTriggered = false; return }
        guard !nudgeTriggered, voice.status == .idle else { return }
        nudgeTriggered = true
        chat.openPanel()
        Task { await voice.connect(phone: phone) }
    }

    // MARK: Online toggle (optimistic)

    func setOnline(_ online: Bool) async {
        guard var user = me, let phone = user.phone else { return }
        let previous = user
        user.status = online ? "online" : "offline"
        me = user
        syncOnlineSideEffects()
        do {
            try await api.setStatus(phone: phone, online: online)
            Haptics.success()
            await loadContext()
        } catch {
            me = previous
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
        await setMe(try await auth.updateAccount(id: id, name: name))
    }

    func updateVehicle(type: String, plate: String, name: String) async throws {
        guard let id = me?.id else { return }
        await setMe(try await auth.updateVehicle(id: id, type: type, plate: plate, name: name))
        await loadContext()
    }

    // MARK: Settings (optimistic with rollback)

    func loadSettings() async {
        guard let id = me?.id else { return }
        do {
            let s = try await auth.settings(accountId: id)
            settings = s
            settingsError = false
            prefs.wakeWordEnabled = s.handsFreeMode
        } catch {
            settingsError = true
        }
    }

    func patchSettings(_ patch: AccountSettingsPatch) async {
        guard let id = me?.id, let previous = settings else { return }
        settings = patch.applied(to: previous)
        if let hf = patch.handsFreeMode { prefs.wakeWordEnabled = hf }
        if patch.notifyOnPickupApproach == true || patch.notifyOnPickupApproachRadiusM != nil {
            Task { await location.pushImmediate(scope: "notify") }
        }
        if patch.autoSuggestNextStop == true { Task { await location.pushImmediate(scope: "suggest") } }
        do {
            settings = try await auth.patchSettings(accountId: id, patch)
        } catch {
            settings = previous
            prefs.wakeWordEnabled = previous.handsFreeMode
            Haptics.error()
        }
    }

    // MARK: Earnings

    func loadEarnings(_ period: String) async {
        do {
            earnings[period] = try await api.earningsSummary(period: period)
            earningsError.remove(period)
        } catch {
            earningsError.insert(period)
        }
    }
}

enum Haptics {
    @MainActor static func success() { UINotificationFeedbackGenerator().notificationOccurred(.success) }
    @MainActor static func warning() { UINotificationFeedbackGenerator().notificationOccurred(.warning) }
    @MainActor static func error() { UINotificationFeedbackGenerator().notificationOccurred(.error) }
}
