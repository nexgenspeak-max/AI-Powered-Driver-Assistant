import CoreLocation
import Foundation
import Testing
@testable import CzenDriver

// Audit fixes (2026-11-15): /auth/me failure + retry, stale writes after logout, trip offer /
// trip card failures, turn-by-turn retargeting, NextStop leg figures, location permission,
// dev-login link, nudge auto-connect, query encoding, earnings hero stat.

// MARK: Scripted backend

/// Per-call script shared by `ScriptedAuth` and `ScriptedDriverAPI`: the next call of a name can
/// be held until released, made to fail, or delayed. Each call takes its orders on entry, so a
/// held call that is told to fail still fails after other calls of the same name went through.
final class CallScript: @unchecked Sendable {
    // Safe: every mutable access goes through `lock`.
    private let lock = NSLock()
    private var held: Set<String> = []
    private var gates: [String: CheckedContinuation<Void, Never>] = [:]
    private var failures: [String: Int] = [:]
    private var delays: [String: Duration] = [:]
    private var counts: [String: Int] = [:]

    /// Holds the next call of `name` until `release(name)`.
    func hold(_ name: String) { lock.withLock { _ = held.insert(name) } }
    func isWaiting(_ name: String) -> Bool { lock.withLock { gates[name] != nil } }
    func release(_ name: String) {
        let gate: CheckedContinuation<Void, Never>? = lock.withLock {
            held.remove(name)
            return gates.removeValue(forKey: name)
        }
        gate?.resume()
    }

    /// The next `times` calls of `name` throw HTTP 503.
    func fail(_ name: String, times: Int = 1) { lock.withLock { failures[name] = times } }
    /// Every call of `name` sleeps first (cancellation ends the sleep with an error).
    func delay(_ name: String, _ duration: Duration) { lock.withLock { delays[name] = duration } }
    func count(_ name: String) -> Int { lock.withLock { counts[name] ?? 0 } }

    func pass(_ name: String) async throws {
        let (mustWait, mustFail, delay): (Bool, Bool, Duration?) = lock.withLock {
            counts[name, default: 0] += 1
            let wait = held.remove(name) != nil
            let remaining = failures[name] ?? 0
            if remaining > 0 { failures[name] = remaining - 1 }
            return (wait, remaining > 0, delays[name])
        }
        if mustWait { await withCheckedContinuation { c in lock.withLock { gates[name] = c } } }
        if let delay { try await Task.sleep(for: delay) }
        if mustFail { throw APIError.http(status: 503, detail: nil) }
    }
}

final class ScriptedAuth: AuthAPI, Sendable {
    let backend: DemoBackend
    let script: CallScript
    init(backend: DemoBackend, script: CallScript) { self.backend = backend; self.script = script }

    func login(phone: String, password: String) async throws -> AuthTokens {
        try await script.pass("login"); return try await backend.login(phone: phone, password: password)
    }
    func register(_ input: RegisterInput) async throws -> RegisterResponse { try await script.pass("register"); return try await backend.register(input) }
    func me() async throws -> AuthUser { try await script.pass("me"); return try await backend.me() }
    func updateAccount(id: String, name: String) async throws -> AuthUser {
        try await script.pass("updateAccount"); return try await backend.updateAccount(id: id, name: name)
    }
    func updateVehicle(id: String, type: String, plate: String, name: String) async throws -> AuthUser {
        try await script.pass("updateVehicle"); return try await backend.updateVehicle(id: id, type: type, plate: plate, name: name)
    }
    func settings(accountId: String) async throws -> AccountSettings { try await script.pass("settings"); return try await backend.settings(accountId: accountId) }
    func patchSettings(accountId: String, _ patch: AccountSettingsPatch) async throws -> AccountSettings {
        try await script.pass("patchSettings"); return try await backend.patchSettings(accountId: accountId, patch)
    }
}

final class ScriptedDriverAPI: DriverAPI, @unchecked Sendable {
    let backend: DemoBackend
    let script: CallScript
    // Safe: `_mutateContext` is only touched under `lock`.
    private let lock = NSLock()
    private var _mutateContext: (@Sendable (inout DriverContext) -> Void)?
    init(backend: DemoBackend, script: CallScript) { self.backend = backend; self.script = script }

    /// Rewrites every context the backend returns from now on.
    func mutateContext(_ change: (@Sendable (inout DriverContext) -> Void)?) { lock.withLock { _mutateContext = change } }

    func setStatus(phone: String, online: Bool) async throws { try await script.pass("setStatus"); try await backend.setStatus(phone: phone, online: online) }
    func context(fresh: Bool) async throws -> DriverContext {
        try await script.pass("context")
        var ctx = try await backend.context(fresh: fresh)
        lock.withLock { _mutateContext }?(&ctx)
        return ctx
    }
    func earningsSummary(period: String) async throws -> EarningsSummary {
        try await script.pass("earningsSummary"); return try await backend.earningsSummary(period: period)
    }
    func pushLocation(_ point: LatLng) async throws {}
    func pushLiveLocation(_ point: LatLng, scope: String?) async throws {}
    func navigation(from: LatLng, to: LatLng) async throws -> NavigationRoute { try await backend.navigation(from: from, to: to) }
    func trip(id: String) async throws -> Trip { try await script.pass("trip"); return try await backend.trip(id: id) }
    func createTrip(_ input: CreateTripInput) async throws -> Trip { try await backend.createTrip(input) }
    func updateTrip(id: String, status: TripStatus, at: LatLng?) async throws -> Trip {
        try await script.pass("updateTrip"); return try await backend.updateTrip(id: id, status: status, at: at)
    }
    func voiceToken(phone: String, lang: String) async throws -> VoiceToken { try await backend.voiceToken(phone: phone, lang: lang) }
}

@MainActor
struct AuditHarness {
    let model: AppModel
    let script: CallScript
    let api: ScriptedDriverAPI
    let socket: RecordingSocket
    let session: AuthSession
    let engine: FakeVoiceEngine

    static func make(meRetryBase: Duration = .milliseconds(20), logoutOfflineTimeout: Duration = .seconds(3)) -> AuditHarness {
        let backend = DemoBackend(latency: .zero)
        let script = CallScript()
        let api = ScriptedDriverAPI(backend: backend, script: script)
        let socket = RecordingSocket()
        let engine = FakeVoiceEngine()
        let session = AuthSession(store: MemoryTokenStore(AuthTokens(accessToken: "demo-access", refreshToken: "demo-refresh"))) { _ in
            AuthTokens(accessToken: "demo-access", refreshToken: "demo-refresh")
        }
        let config = AppConfig(tripServiceURL: URL(string: "http://localhost:8002/api/v1")!, authServiceURL: URL(string: "http://localhost:8003/api/v1")!,
                               webSocketURL: URL(string: "ws://localhost:8002/ws")!, goongMapsKey: nil, launch: LaunchOptions(arguments: ["-demo"]))
        let model = AppModel(config: config, auth: ScriptedAuth(backend: backend, script: script), api: api, session: session,
                             prefs: Preferences(defaults: UserDefaults(suiteName: "test-\(UUID())")!),
                             voiceEngine: engine, socket: socket, audio: FillerAudio(enabled: false),
                             meRetryBase: meRetryBase, logoutOfflineTimeout: logoutOfflineTimeout)
        return AuditHarness(model: model, script: script, api: api, socket: socket, session: session, engine: engine)
    }

    func expectSignedOutClean(startsBefore: Int) async {
        #expect(model.phase == .signedOut)
        #expect(model.me == nil)
        #expect(await session.driverPhone == nil)
        #expect(socket.starts == startsBefore)
        #expect(socket.running == false)
        #expect(model.location.backgroundTracking == false)
    }
}

// MARK: 1 — /auth/me failure

@MainActor
@Suite("Profile load failure")
struct MeFailureTests {
    @Test("a failed /auth/me raises meError, retries with backoff and then loads the context")
    func retriesUntilLoaded() async {
        let h = AuditHarness.make()
        h.script.fail("me", times: 2)
        await h.model.bootstrap()
        #expect(h.model.phase == .signedIn)
        #expect(h.model.me == nil)
        #expect(h.model.meError)
        #expect(h.model.context == nil)
        #expect(h.script.count("context") == 0) // gated on the profile, like `enabled: !!driver`

        await waitUntil { h.model.context != nil }
        #expect(h.model.me != nil)
        #expect(h.model.meError == false)
        #expect(h.model.context != nil)
        #expect(h.script.count("me") == 3)
        #expect(h.socket.starts == 1) // the demo driver is online
    }

    @Test("loadContext loads the profile first when it is missing (the Thử lại button)")
    func loadContextLoadsMeFirst() async {
        let h = AuditHarness.make(meRetryBase: .seconds(60))
        h.script.fail("me", times: 1)
        await h.model.bootstrap()
        #expect(h.model.meError)

        await h.model.loadContext(fresh: true)
        #expect(h.model.me != nil)
        #expect(h.model.meError == false)
        #expect(h.model.context != nil)
    }

    @Test("a manual retry that succeeds cancels the background retry (no second context load)")
    func manualRetryCancelsBackgroundRetry() async {
        let h = AuditHarness.make(meRetryBase: .milliseconds(30))
        h.script.fail("me", times: 1)
        await h.model.bootstrap()
        #expect(h.model.meError)
        await h.model.loadContext(fresh: true) // "Thử lại" wins the race
        #expect(h.model.context != nil)
        try? await Task.sleep(for: .milliseconds(200))
        #expect(h.script.count("me") == 2)
        #expect(h.script.count("context") == 1)
    }

    @Test("login over a live session replaces the previous account's profile, socket, context and settings")
    func loginWhileSignedIn() async throws {
        let h = AuditHarness.make()
        await h.model.bootstrap()
        await h.model.loadSettings()
        await h.model.loadEarnings("week")
        #expect(h.model.settings != nil)
        let firstName = try #require(h.model.me?.name)
        // The backend now answers as another driver (what /auth/me returns for the new tokens).
        _ = try await h.api.backend.updateAccount(id: "acc", name: "Tài xế B")
        h.script.hold("context")
        let login = Task { try await h.model.login(phone: "0909999999", password: "secret1") }
        await waitUntil { h.script.isWaiting("context") }
        // The new profile is in, and nothing of the previous account is left while its context loads.
        #expect(h.model.phase == .signedIn)
        #expect(h.model.me?.name == "Tài xế B")
        #expect(h.model.me?.name != firstName)
        #expect(h.model.context == nil)
        #expect(h.model.settings == nil)
        #expect(h.model.earnings.isEmpty)
        #expect(h.script.count("me") == 2)
        #expect(h.socket.starts == 2) // restarted for the new session
        h.script.release("context")
        try await login.value
        #expect(h.model.context != nil)
        #expect(await h.session.accessToken != nil)
    }

    @Test("logout stops the retry and clears the error")
    func logoutStopsRetry() async {
        let h = AuditHarness.make()
        h.script.fail("me", times: 1000)
        await h.model.bootstrap()
        await waitUntil { h.script.count("me") >= 2 }
        await h.model.logout()
        let calls = h.script.count("me")
        try? await Task.sleep(for: .milliseconds(150))
        #expect(h.script.count("me") <= calls + 1) // at most the attempt already in flight
        #expect(h.model.meError == false)
        await h.expectSignedOutClean(startsBefore: 0)
    }

    @Test("retry delays double from the base and cap at 30 s")
    func schedule() {
        let delays = (1...6).map { AppModel.meRetryDelay(attempt: $0, base: .seconds(2)) }
        #expect(delays == [.seconds(2), .seconds(4), .seconds(8), .seconds(16), .seconds(30), .seconds(30)])
    }
}

// MARK: 4 — stale writes after logout

@MainActor
@Suite("Stale writes after logout (audit)")
struct StaleWriteTests {
    @Test("a setOnline failure that lands after logout does not restore `me` or restart the socket")
    func setOnlineRollbackAfterLogout() async {
        let h = AuditHarness.make()
        await h.model.bootstrap()
        #expect(h.model.isOnline)
        let starts = h.socket.starts
        h.script.hold("setStatus")
        h.script.fail("setStatus")
        let toggle = Task { await h.model.setOnline(false) }
        await waitUntil { h.script.isWaiting("setStatus") }
        await h.model.logout()
        h.script.release("setStatus")
        await toggle.value
        await h.expectSignedOutClean(startsBefore: starts)
    }

    @Test("a failed setOnline while signed in rolls the status back")
    func setOnlineRollback() async {
        let h = AuditHarness.make()
        await h.model.bootstrap()
        h.script.fail("setStatus")
        await h.model.setOnline(false)
        #expect(h.model.isOnline)
        #expect(h.socket.running)
    }

    @Test("patchSettings resolving after logout writes neither settings nor the wake-word preference", arguments: [true, false])
    func patchSettingsAfterLogout(fails: Bool) async {
        let h = AuditHarness.make()
        await h.model.bootstrap()
        await h.model.loadSettings()
        #expect(h.model.settings != nil)
        let optimistic = !(h.model.settings?.handsFreeMode ?? false)
        h.script.hold("patchSettings")
        if fails { h.script.fail("patchSettings") }
        let patch = Task { await h.model.patchSettings(AccountSettingsPatch(handsFreeMode: optimistic)) }
        await waitUntil { h.script.isWaiting("patchSettings") }
        #expect(h.model.prefs.wakeWordEnabled == optimistic)
        await h.model.logout()
        h.script.release("patchSettings")
        await patch.value
        #expect(h.model.settings == nil)
        #expect(h.model.prefs.wakeWordEnabled == optimistic) // the rollback did not run
        #expect(h.model.phase == .signedOut)
    }

    @Test("loadEarnings resolving after logout does not bring the previous account's totals back", arguments: [true, false])
    func loadEarningsAfterLogout(fails: Bool) async {
        let h = AuditHarness.make()
        await h.model.bootstrap()
        h.script.hold("earningsSummary")
        if fails { h.script.fail("earningsSummary") }
        let load = Task { await h.model.loadEarnings("week") }
        await waitUntil { h.script.isWaiting("earningsSummary") }
        await h.model.logout()
        h.script.release("earningsSummary")
        await load.value
        #expect(h.model.earnings.isEmpty)
        #expect(h.model.earningsError.isEmpty)
    }

    @Test("a loadSettings failure that lands after logout does not flag an error")
    func loadSettingsFailureAfterLogout() async {
        let h = AuditHarness.make()
        await h.model.bootstrap()
        h.script.hold("settings")
        h.script.fail("settings")
        let load = Task { await h.model.loadSettings() }
        await waitUntil { h.script.isWaiting("settings") }
        await h.model.logout()
        h.script.release("settings")
        await load.value
        #expect(h.model.settingsError == false)
        #expect(h.model.settings == nil)
    }

    @Test("logout does not wait for a hung offline PATCH")
    func logoutCapsOfflinePatch() async {
        let h = AuditHarness.make(logoutOfflineTimeout: .milliseconds(50))
        await h.model.bootstrap()
        h.script.delay("setStatus", .seconds(30))
        let started = ContinuousClock.now
        await h.model.logout()
        #expect(ContinuousClock.now - started < .seconds(5))
        #expect(h.script.count("setStatus") == 1)
        #expect(h.model.phase == .signedOut)
        #expect(await h.session.accessToken == nil)
    }
}

// MARK: 2, 6, 7 — trip offer and trip card failures

@MainActor
@Suite("Trip action failures")
struct TripActionFailureTests {
    @Test("the offer sheet dismisses only when the request succeeded")
    func offerDismissOnlyOnSuccess() async {
        let success = await TripOfferLogic.run {}
        #expect(success == .dismiss)
        let conflict = await TripOfferLogic.run { throw APIError.http(status: 409, detail: "Chuyến đã có tài xế khác nhận") }
        #expect(conflict == .stay(message: "Chuyến đã có tài xế khác nhận"))
        let network = await TripOfferLogic.run { throw APIError.network("offline") }
        #expect(network == .stay(message: TripActionFailure.generic))
    }

    @Test("a failed accept through the model keeps the sheet open and leaves the trip pending")
    func acceptFailureKeepsOffer() async {
        let h = AuditHarness.make()
        await h.model.bootstrap()
        #expect(h.model.pendingTrips.contains { $0.tripId == "trip-offer-01" })
        let contextLoads = h.script.count("context")
        h.script.fail("updateTrip")
        let outcome = await TripOfferLogic.run { try await h.model.acceptTrip("trip-offer-01") }
        #expect(outcome == .stay(message: TripActionFailure.generic))
        #expect(h.script.count("context") == contextLoads) // no reload after a failure
        #expect(h.model.pendingTrips.contains { $0.tripId == "trip-offer-01" })
        #expect(h.model.context?.activeTrips.contains { $0.tripId == "trip-offer-01" } == false)

        let accepted = await TripOfferLogic.run { try await h.model.acceptTrip("trip-offer-01") }
        #expect(accepted == .dismiss)
        #expect(h.model.context?.activeTrips.contains { $0.tripId == "trip-offer-01" } == true)
    }

    @Test("offer fetch: failure and cancellation are told apart")
    func offerFetch() async {
        let failed = await TripOfferLogic.fetch("x") { _ in throw APIError.http(status: 500, detail: nil) }
        #expect(failed == .failed(transient: true))
        let gone = await TripOfferLogic.fetch("x") { _ in throw APIError.http(status: 404, detail: nil) }
        #expect(gone == .failed(transient: false))
        #expect(TripOfferLogic.isTransient(APIError.network("offline")))
        #expect(TripOfferLogic.isTransient(APIError.http(status: 429, detail: nil)))
        #expect(!TripOfferLogic.isTransient(APIError.http(status: 409, detail: nil)))
        #expect(!TripOfferLogic.isTransient(APIError.decoding("x")))
        let cancelled = await TripOfferLogic.fetch("x") { _ in throw APIError.cancelled }
        #expect(cancelled == .cancelled)
        #expect(TripOfferLogic.retryDelay(attempt: 1) == .seconds(1))
        #expect(TripOfferLogic.retryDelay(attempt: 9) == .seconds(3))
    }

    @Test("an offer is live only while notified / calling and addressed to this driver")
    func stillOffered() {
        var trip = Trip(tripId: "t", status: .notified, driverPhone: "0901", pickupAddress: "a", dropoffAddress: "b")
        #expect(TripOfferLogic.isStillOffered(trip, driverPhone: "0901"))
        #expect(!TripOfferLogic.isStillOffered(trip, driverPhone: "0902"))
        trip.status = .confirmed
        #expect(!TripOfferLogic.isStillOffered(trip, driverPhone: "0901"))
    }

    @Test("trip action alerts show the server detail for any status, else the generic text", arguments: [400, 404, 409, 422, 500])
    func detailForAnyStatus(status: Int) async {
        let error = APIError.http(status: status, detail: "Bạn còn cách điểm đón 2,3 km")
        #expect(TripActionFailure.text(for: error, generic: TripActionFailure.arrivalGeneric) == "Bạn còn cách điểm đón 2,3 km")
        #expect(TripActionFailure.text(for: APIError.http(status: status, detail: nil)) == TripActionFailure.generic)
        #expect(TripActionFailure.text(for: TestError(), generic: TripActionFailure.arrivalGeneric) == TripActionFailure.arrivalGeneric)
        let success = await TripActionFailure.message {}
        #expect(success == nil)
        let failure = await TripActionFailure.message { throw error }
        #expect(failure == "Bạn còn cách điểm đón 2,3 km")
    }
}

// MARK: 2 — offer countdown / load

/// Scripted `fetch` for `TripOfferModel`: per-id results, optional gates, call log.
@MainActor
final class OfferBackend {
    var results: [String: Result<Trip, APIError>] = [:]
    var held: Set<String> = []
    private(set) var calls: [String] = []
    private var gates: [String: [CheckedContinuation<Void, Never>]] = [:]
    var offerId: String?
    private(set) var dismissed: [String] = []

    static func trip(_ id: String, status: TripStatus = .notified) -> Trip {
        Trip(tripId: id, status: status, driverPhone: "0901", pickupAddress: "Đón \(id)", dropoffAddress: "Trả \(id)")
    }

    func isWaiting(_ id: String) -> Bool { gates[id]?.isEmpty == false }
    func release(_ id: String) {
        held.remove(id)
        let waiting = gates.removeValue(forKey: id) ?? []
        waiting.forEach { $0.resume() }
    }

    var env: TripOfferModel.Env {
        TripOfferModel.Env(
            fetch: { [self] id in
                calls.append(id)
                if held.contains(id) { await withCheckedContinuation { gates[id, default: []].append($0) } }
                return try (results[id] ?? .failure(.http(status: 404, detail: nil))).get()
            },
            currentOfferId: { [self] in offerId },
            driverPhone: { "0901" },
            dismiss: { [self] id in
                dismissed.append(id)
                if offerId == id { offerId = nil }
            }
        )
    }
}

@MainActor
@Suite("Trip offer countdown and load")
struct TripOfferModelTests {
    func makeModel(duration: Int = 3) -> TripOfferModel {
        TripOfferModel(duration: duration, second: .milliseconds(30), maxRetries: 3, retryDelay: { _ in .milliseconds(5) })
    }

    @Test("the countdown closes the sheet even though the trip never loads, and the retries stop",
          arguments: [APIError.network("offline"), APIError.http(status: 503, detail: nil)])
    func countdownIndependentOfLoad(error: APIError) async {
        let backend = OfferBackend()
        backend.offerId = "A"
        backend.results["A"] = .failure(error)
        let offer = makeModel()
        await offer.run(tripId: "A", env: backend.env) // returns: the countdown expired
        #expect(backend.dismissed == ["A"])
        #expect(backend.offerId == nil)
        #expect(offer.remaining == 0)
        #expect(offer.trip == nil)
        #expect(backend.calls.count == 4) // first try + 3 retries, like React Query
        let calls = backend.calls.count
        try? await Task.sleep(for: .milliseconds(80))
        #expect(backend.calls.count == calls)
    }

    @Test("a hung fetch does not freeze the countdown")
    func hungFetch() async {
        let backend = OfferBackend()
        backend.offerId = "A"
        backend.held = ["A"]
        let offer = makeModel()
        await offer.run(tripId: "A", env: backend.env)
        #expect(backend.dismissed == ["A"])
        backend.release("A")
    }

    @Test("a 404 (offer cancelled / reassigned) is not retried; the sheet still closes at zero")
    func notFoundIsFinal() async {
        let backend = OfferBackend()
        backend.offerId = "A"
        backend.results["A"] = .failure(.http(status: 404, detail: "Không tìm thấy chuyến"))
        let offer = makeModel()
        await offer.run(tripId: "A", env: backend.env)
        #expect(backend.calls == ["A"])
        #expect(backend.dismissed == ["A"])
    }

    @Test("the trip loads while the countdown runs; an offer that is no longer ours closes at once")
    func loadsAndDismissesStaleOffer() async {
        let backend = OfferBackend()
        backend.offerId = "A"
        backend.results["A"] = .success(OfferBackend.trip("A"))
        let offer = makeModel(duration: 1000)
        let run = Task { await offer.run(tripId: "A", env: backend.env) }
        await waitUntil { offer.trip != nil }
        #expect(offer.trip?.tripId == "A")
        #expect(backend.dismissed.isEmpty)
        #expect(backend.calls == ["A"]) // one fetch on appear, not two

        backend.results["A"] = .success(OfferBackend.trip("A", status: .confirmed))
        offer.refresh() // a `trip-offer` invalidation
        await waitUntil { !backend.dismissed.isEmpty }
        #expect(backend.dismissed == ["A"])
        run.cancel()
        await run.value
    }

    @Test("a response for the previous offer never shows under the new offer's id", arguments: ["initial load", "refresh"])
    func staleResponseAfterIdChange(source: String) async {
        let backend = OfferBackend()
        backend.offerId = "A"
        backend.results["A"] = .success(OfferBackend.trip("A"))
        backend.results["B"] = .success(OfferBackend.trip("B"))
        let offer = makeModel(duration: 1000)
        if source == "initial load" { backend.held = ["A"] }
        let first = Task { await offer.run(tripId: "A", env: backend.env) }
        if source == "refresh" {
            await waitUntil { offer.trip?.tripId == "A" }
            backend.held = ["A"]
            offer.refresh()
        }
        await waitUntil { backend.isWaiting("A") }

        // Offer B replaces A while A's fetch is in flight (the view restarts `.task(id:)`).
        backend.offerId = "B"
        backend.held.insert("B")
        first.cancel()
        let second = Task { await offer.run(tripId: "B", env: backend.env) }
        await waitUntil { backend.isWaiting("B") }
        #expect(offer.tripId == "B")
        #expect(offer.trip == nil) // A's details are gone as soon as the id changes

        backend.release("A")
        try? await Task.sleep(for: .milliseconds(50))
        #expect(offer.trip == nil) // A's late response is dropped

        backend.release("B")
        await waitUntil { offer.trip != nil }
        #expect(offer.trip?.tripId == "B")
        #expect(backend.dismissed.isEmpty)
        second.cancel()
        await first.value
        await second.value
    }

    @Test("a transient failure is retried and the trip then shows")
    func retryThenLoaded() async {
        let backend = OfferBackend()
        backend.offerId = "A"
        backend.results["A"] = .failure(.network("offline"))
        let offer = makeModel(duration: 1000)
        let run = Task { await offer.run(tripId: "A", env: backend.env) }
        await waitUntil { backend.calls.count >= 2 }
        backend.results["A"] = .success(OfferBackend.trip("A"))
        await waitUntil { offer.trip != nil }
        #expect(offer.trip?.tripId == "A")
        run.cancel()
        await run.value
    }
}

// MARK: 3 — turn-by-turn retargeting

@MainActor
@Suite("Turn-by-turn retargeting")
struct RetargetTests {
    let origin = LatLng(lat: 21.03, lng: 105.83)
    let first = LatLng(lat: 21.04, lng: 105.84)
    let second = LatLng(lat: 21.05, lng: 105.85)

    func makeNav() -> TurnByTurn {
        let step = RouteStep(instruction: "", maneuver: "straight", distanceM: 1500, durationS: 300, startLocation: origin, endLocation: first)
        let route = NavigationRoute(distanceKm: 1.5, etaMinutes: 5, trafficNote: nil, polyline: Geo.encodePolyline([origin, first]), steps: [step])
        return TurnByTurn(api: NavigationStubAPI(route: route))
    }

    @Test("a new next stop re-routes to it; no next stop ends navigation")
    func retarget() async {
        let nav = makeNav()
        await nav.start(from: origin, to: first)
        #expect(nav.state == .active)

        await nav.retarget(to: second, from: origin)
        #expect(nav.destination == second)
        #expect(nav.state == .active)

        await nav.retarget(to: nil, from: origin)
        #expect(nav.state == .idle)
        #expect(nav.destination == nil)
    }

    @Test("coordinates equal to 5 decimals are the same stop: no re-route on float jitter")
    func jitterIsNotANewStop() async {
        let nav = makeNav()
        await nav.start(from: origin, to: first)
        await nav.retarget(to: LatLng(lat: first.lat + 0.000_000_4, lng: first.lng - 0.000_000_4), from: origin)
        #expect(nav.destination == first) // untouched: no restart
        #expect(TurnByTurn.sameStop(LatLng(lat: 21.040004, lng: 105.84), LatLng(lat: 21.0400041, lng: 105.8399999)))
        #expect(!TurnByTurn.sameStop(LatLng(lat: 21.04, lng: 105.84), LatLng(lat: 21.04002, lng: 105.84)))
    }

    @Test("a new next stop during the \"Đã đến nơi\" HUD continues to it, as in RN")
    func retargetWhileArrived() async {
        let nav = makeNav()
        await nav.start(from: origin, to: first)
        nav.update(position: first)
        #expect(nav.state == .arrived)
        await nav.retarget(to: second, from: first)
        #expect(nav.state == .active)
        #expect(nav.destination == second)
        try? await Task.sleep(for: .milliseconds(50))
        #expect(nav.state == .active) // the arrival timer no longer closes it
    }

    @Test("retarget does nothing while not navigating")
    func idleStaysIdle() async {
        let nav = makeNav()
        await nav.retarget(to: second, from: origin)
        #expect(nav.state == .idle)
        #expect(nav.destination == nil)
    }

    @Test("a context whose next stop changed or vanished moves / stops the running navigation")
    func contextDrivesNavigation() async throws {
        let h = AuditHarness.make()
        await h.model.bootstrap()
        let next = try #require(NextStop.from(h.model.context))
        await h.model.navigation.start(from: h.model.location.current, to: next.coordinate)
        #expect(h.model.navigation.state == .active)

        h.api.mutateContext { $0.optimizedRoute?.stops.removeFirst() }
        await h.model.loadContext()
        let moved = try #require(NextStop.from(h.model.context))
        #expect(moved.coordinate != next.coordinate)
        await waitUntil { h.model.navigation.destination == moved.coordinate && h.model.navigation.state == .active }
        #expect(h.model.navigation.destination == moved.coordinate)

        h.api.mutateContext { $0.optimizedRoute = nil; $0.activeTrips = []; $0.currentTrip = nil }
        await h.model.loadContext()
        await waitUntil { h.model.navigation.state == .idle }
        #expect(h.model.navigation.state == .idle)
    }
}

// MARK: 9 — NextStop leg figures

@MainActor
@Suite("Next stop without an optimized route")
struct NextStopLegTests {
    func context(status: TripStatus) -> DriverContext {
        let trip = Trip(tripId: "t1", status: status, pickupAddress: "Đón", dropoffAddress: "Trả",
                        pickupLat: 21.03, pickupLng: 105.83, dropoffLat: 21.05, dropoffLng: 105.86, distanceKm: 3.7, etaMinutes: 11)
        return DriverContext(upcomingTrips: [], activeTrips: [trip], completedTrips: [], currentTrip: trip)
    }

    @Test("heading to the pickup: the trip's pickup→dropoff figures are not used", arguments: [TripStatus.confirmed, .arrivedPickup])
    func pickupLeg(status: TripStatus) throws {
        let stop = try #require(NextStop.from(context(status: status)))
        #expect(stop.isPickup)
        #expect(stop.serverDistanceM == nil)
        #expect(stop.serverEtaMin == nil)
        #expect(stop.routeOrigin == nil)
    }

    @Test("heading to the dropoff: server figures apply, measured from the pickup")
    func dropoffLeg() throws {
        let stop = try #require(NextStop.from(context(status: .pickedUp)))
        #expect(!stop.isPickup)
        #expect(stop.serverDistanceM == 3700)
        #expect(stop.serverEtaMin == 11)
        #expect(stop.routeOrigin == LatLng(lat: 21.03, lng: 105.83))
    }
}

// MARK: 5, 7, 16 — location

@MainActor
@Suite("Location permission and modes")
struct LocationAuditTests {
    @Test("Always is requested only while background tracking is on and the status is When-In-Use")
    func alwaysRequest() {
        #expect(LocationTracker.shouldRequestAlways(backgroundTracking: true, status: .authorizedWhenInUse))
        #expect(!LocationTracker.shouldRequestAlways(backgroundTracking: false, status: .authorizedWhenInUse))
        for status in [CLAuthorizationStatus.notDetermined, .denied, .restricted, .authorizedAlways] {
            #expect(!LocationTracker.shouldRequestAlways(backgroundTracking: true, status: status))
        }
    }

    @Test("background uses balanced accuracy and a 100 m filter, foreground 10 m / 5 m")
    func updateSettings() {
        let background = LocationTracker.updateSettings(inBackground: true)
        #expect(background.accuracy == kCLLocationAccuracyHundredMeters)
        #expect(background.distanceFilter == 100)
        let foreground = LocationTracker.updateSettings(inBackground: false)
        #expect(foreground.accuracy == kCLLocationAccuracyNearestTenMeters)
        #expect(foreground.distanceFilter == 5)

        let tracker = LocationTracker(api: DemoBackend(latency: .zero), demo: true)
        tracker.setInBackground(true)
        #expect(tracker.inBackground)
        tracker.setInBackground(false)
        #expect(!tracker.inBackground)
    }

    /// Non-demo logic without touching `CLLocationManager`: nothing but the test resolves a fix.
    func makeTracker() -> LocationTracker { LocationTracker(api: DemoBackend(latency: .zero), demo: false, usesSystemLocation: false) }

    @Test("a denied-permission failure releases a pending fresh fix at once; other failures do not")
    func deniedReleasesWaiters() async {
        let tracker = makeTracker()
        #expect(tracker.authorization == .notDetermined)
        let done = Flag()
        let fix = Task { _ = await tracker.freshFix(timeout: .seconds(20)); done.value = true }
        try? await Task.sleep(for: .milliseconds(50))
        #expect(!done.value)
        tracker.handleLocationFailure(denied: false) // transient (kCLErrorLocationUnknown)
        try? await Task.sleep(for: .milliseconds(50))
        #expect(!done.value)
        tracker.handleLocationFailure(denied: true)
        await waitUntil { done.value }
        #expect(done.value)
        await fix.value
    }

    @Test("permission turning denied / restricted releases waiters; later fixes return at once",
          arguments: [CLAuthorizationStatus.denied, .restricted])
    func deniedAuthorization(status: CLAuthorizationStatus) async {
        let tracker = makeTracker()
        let done = Flag()
        let fix = Task { _ = await tracker.freshFix(timeout: .seconds(20)); done.value = true }
        try? await Task.sleep(for: .milliseconds(50))
        #expect(!done.value)
        tracker.handleAuthorizationChange(status)
        await waitUntil { done.value }
        #expect(done.value)
        await fix.value
        #expect(tracker.authorization == status)

        let started = ContinuousClock.now
        _ = await tracker.freshFix(timeout: .seconds(20))
        #expect(ContinuousClock.now - started < .seconds(2))
    }

    @MainActor final class Flag { var value = false }
}

// MARK: 8 — dev-login link

#if DEBUG
@Suite("Dev-login deep link")
struct DevLoginLinkTests {
    @Test("driver-app://dev-login?phone=&password= parses, keeping a leading +")
    func parses() throws {
        let link = try #require(DevLoginLink(url: URL(string: "driver-app://dev-login?phone=%2B84901234567&password=secret1")!))
        #expect(link.phone == "+84901234567")
        #expect(link.password == "secret1")
        #expect(DevLoginLink(url: URL(string: "driver-app:///dev-login?phone=0901234567&password=p")!)?.phone == "0901234567")
    }

    @Test("other schemes, routes and incomplete links are ignored", arguments: [
        "https://dev-login?phone=0901234567&password=p",
        "driver-app://open/trips",
        "driver-app://dev-login?phone=0901234567",
        "driver-app://dev-login?phone=&password=p",
        "driver-app://dev-login",
    ])
    func rejects(raw: String) throws {
        #expect(DevLoginLink(url: try #require(URL(string: raw))) == nil)
    }
}
#endif

// MARK: 10 — nudge auto-connect on voice status change

@MainActor
@Suite("Nudge auto-connect")
struct NudgeAutoConnectTests {
    @Test("a nudge that arrived during a live session connects once the session goes idle")
    func connectsWhenIdleAgain() async {
        let h = AuditHarness.make()
        await h.model.bootstrap()
        await h.model.voice.connect(phone: "0901234567")
        #expect(h.model.voice.status == .connected)
        #expect(h.engine.connectCalls == 1)

        h.api.mutateContext { $0.hasPendingNudge = true }
        await h.model.loadContext()
        #expect(h.engine.connectCalls == 1) // busy: not triggered, and not marked as triggered

        h.model.voice.disconnect()
        await waitUntil { h.model.voice.status == .idle }
        h.model.autoConnectOnNudge() // RootView calls this when `voice.status` changes
        await waitUntil { h.engine.connectCalls == 2 }
        #expect(h.engine.connectCalls == 2)
        #expect(h.model.chat.panelOpen)

        // Once per nudge: the driver hangs up while the server still reports the nudge as pending.
        await waitUntil { h.model.voice.status == .connected }
        h.model.voice.disconnect()
        await waitUntil { h.model.voice.status == .idle }
        #expect(h.model.voice.status == .idle)
        h.model.autoConnectOnNudge()
        try? await Task.sleep(for: .milliseconds(100))
        #expect(h.engine.connectCalls == 2)
        #expect(h.model.voice.status == .idle)

        // The nudge was delivered; a later one triggers again.
        h.api.mutateContext { $0.hasPendingNudge = false }
        await h.model.loadContext()
        h.api.mutateContext { $0.hasPendingNudge = true }
        await h.model.loadContext()
        await waitUntil { h.engine.connectCalls == 3 }
        #expect(h.engine.connectCalls == 3)
    }
}

// MARK: 12 — query encoding

private final class RecordingTransport: HTTPTransport, @unchecked Sendable {
    // Safe: `_urls` is only touched under `lock`.
    private let lock = NSLock()
    private var _urls: [URL] = []
    var urls: [URL] { lock.withLock { _urls } }

    func send(_ request: URLRequest) async throws -> (Data, HTTPURLResponse) {
        lock.withLock { _urls.append(request.url!) }
        let body = #"{"token":"t","room_name":"r","livekit_url":"wss://x"}"#
        return (Data(body.utf8), HTTPURLResponse(url: request.url!, statusCode: 200, httpVersion: nil, headerFields: nil)!)
    }
}

@Suite("Query encoding")
struct QueryEncodingTests {
    @Test("the dispatch socket URL carries + as %2B")
    func socketURL() throws {
        let url = try #require(LiveDispatchSocket.socketURL(base: URL(string: "ws://host:8002/ws")!, phone: "+84901234567"))
        #expect(url.absoluteString == "ws://host:8002/ws?role=driver&id=%2B84901234567")
        let local = try #require(LiveDispatchSocket.socketURL(base: URL(string: "ws://host:8002/ws")!, phone: "0901234567"))
        #expect(local.absoluteString == "ws://host:8002/ws?role=driver&id=0901234567")
    }

    @Test("HTTP query values are encoded like encodeURIComponent")
    func httpQuery() async throws {
        let transport = RecordingTransport()
        let session = AuthSession(store: MemoryTokenStore(AuthTokens(accessToken: "a", refreshToken: "r"))) { _ in AuthTokens(accessToken: "a", refreshToken: "r") }
        let http = HTTPClient(baseURL: URL(string: "http://test/api/v1")!, transport: transport, session: session, sendsDriverPhone: false)
        _ = try await LiveDriverAPI(http: http).voiceToken(phone: "+84901234567", lang: "vi")
        let query = try #require(transport.urls.first?.query(percentEncoded: true))
        #expect(query == "driver_phone=%2B84901234567&lang=vi")
        #expect(QueryEncoding.encode("a b&c=d/é") == "a%20b%26c%3Dd%2F%C3%A9")
        #expect(QueryEncoding.encode("21.0333") == "21.0333")
    }
}

// MARK: 15 — earnings hero

@Suite("Earnings hero third stat")
struct EarningsHeroStatTests {
    @Test("hours first, then bonus, and no third stat when neither exists")
    func third() {
        #expect(EarningsHeroStat.third(hours: nil, bonus: nil) == nil)
        #expect(EarningsHeroStat.third(hours: 6.5, bonus: 20000)?.label == "Giờ online")
        #expect(EarningsHeroStat.third(hours: 6.5, bonus: nil)?.value == "6,5 giờ")
        #expect(EarningsHeroStat.third(hours: nil, bonus: 20000)?.label == "Thưởng")
    }
}
