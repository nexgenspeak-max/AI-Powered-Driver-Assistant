import Foundation
import Testing
@testable import CzenDriver

// Regression tests for the session-lifecycle review findings (voice connect cancel / failure,
// refresh vs logout, navigation stale fetches, sign-out teardown).

@MainActor
func waitUntil(timeout: Duration = .seconds(3), _ condition: () -> Bool) async {
    let deadline = ContinuousClock.now + timeout
    while !condition(), ContinuousClock.now < deadline { try? await Task.sleep(for: .milliseconds(5)) }
}

/// Behaves like the LiveKit engine: a room exists from the start of `connect`; disconnecting it
/// emits `.disconnected` (and once more ~30 ms later, like the delegate callback). A disconnect
/// while the join is suspended is ignored by the room, but one that lands after the join resumed
/// makes `connect` leave and throw (as `LiveKitVoiceEngine` does).
@MainActor
final class FakeVoiceEngine: VoiceEngine {
    var onEvent: ((VoiceEvent) -> Void)?
    private(set) var isConnected = false
    private(set) var connectCalls = 0
    private(set) var micEnabled = false
    private(set) var published: [(String, [String: String])] = []
    var connectError: Error?
    var holdConnect = false
    private var gate: CheckedContinuation<Void, Never>?
    private var hasRoom = false
    private var roomGeneration = 0

    func connect(url: String, token: String) async throws {
        connectCalls += 1
        roomGeneration += 1
        hasRoom = true
        if holdConnect { await withCheckedContinuation { gate = $0 } }
        if let connectError { throw connectError }
        // Disconnected while joining: like LiveKitVoiceEngine, leave instead of going live.
        guard hasRoom else { throw CancellationError() }
        isConnected = true
    }

    func releaseConnect() {
        gate?.resume()
        gate = nil
    }

    var isWaitingInConnect: Bool { gate != nil }

    func setMicrophone(enabled: Bool) async throws -> Bool {
        guard isConnected else { return false }
        micEnabled = enabled
        return true
    }

    func sendChat(_ text: String) async throws {}

    func publish(topic: String, json: [String: String]) async throws { published.append((topic, json)) }

    func disconnect() async {
        guard hasRoom else { return }
        if !isConnected && gate != nil { return } // mid-connect: ignored by the room
        hasRoom = false
        isConnected = false
        micEnabled = false
        onEvent?(.disconnected)
        // The delegate's own callback, dropped once a newer room exists (as LiveKitVoiceEngine does).
        let gen = roomGeneration
        Task { [weak self] in
            try? await Task.sleep(for: .milliseconds(30))
            guard let self, self.roomGeneration == gen else { return }
            self.onEvent?(.disconnected)
        }
    }
}

struct TestError: Error {}

@MainActor
@Suite("Voice session lifecycle")
struct VoiceLifecycleTests {
    func makeSession(engine: FakeVoiceEngine, latency: Duration = .zero) -> VoiceSession {
        VoiceSession(engine: engine, api: DemoBackend(latency: latency), prefs: Preferences(defaults: UserDefaults(suiteName: "test-\(UUID())")!),
                     audio: FillerAudio(enabled: false), settleDelay: .zero, asksMicPermission: false)
    }

    @Test("hang-up while the room connects cancels it and never leaves a live mic")
    func hangUpDuringRoomConnect() async {
        let engine = FakeVoiceEngine()
        engine.holdConnect = true
        let session = makeSession(engine: engine)
        let connect = Task { await session.connect(phone: "0901234567") }
        await waitUntil { engine.isWaitingInConnect }
        #expect(session.status == .connecting)

        session.disconnect(userInitiated: true)
        #expect(session.status == .idle)
        engine.holdConnect = false
        engine.releaseConnect() // the server completes the join anyway
        await connect.value
        try? await Task.sleep(for: .milliseconds(80))

        #expect(session.status == .idle)
        #expect(engine.isConnected == false)
        #expect(engine.micEnabled == false)
    }

    @Test("logout during the token fetch never starts the room")
    func cancelDuringTokenFetch() async {
        let engine = FakeVoiceEngine()
        let session = makeSession(engine: engine, latency: .milliseconds(150))
        let connect = Task { await session.connect(phone: "0901234567") }
        await waitUntil { session.status == .connecting }
        session.disconnect()
        await connect.value
        try? await Task.sleep(for: .milliseconds(80))
        #expect(engine.connectCalls == 0)
        #expect(engine.isConnected == false)
        #expect(session.status == .idle)
    }

    @Test("a failed connect ends in .error even though the engine reports .disconnected")
    func failedConnectStaysError() async {
        let engine = FakeVoiceEngine()
        engine.connectError = TestError()
        let session = makeSession(engine: engine)
        await session.connect(phone: "0901234567")
        try? await Task.sleep(for: .milliseconds(120)) // let the late .disconnected events land
        #expect(session.status == .error)
    }

    @Test("a reconnect after a cancelled connect goes live")
    func reconnectAfterCancel() async {
        let engine = FakeVoiceEngine()
        engine.holdConnect = true
        let session = makeSession(engine: engine)
        let first = Task { await session.connect(phone: "0901234567") }
        await waitUntil { engine.isWaitingInConnect }
        session.disconnect()
        engine.holdConnect = false
        engine.releaseConnect()
        await first.value
        await session.connect(phone: "0901234567")
        try? await Task.sleep(for: .milliseconds(80))
        #expect(session.status == .connected)
        #expect(engine.isConnected)
    }

    @Test("a live session that drops returns to idle")
    func remoteDrop() async {
        let engine = FakeVoiceEngine()
        let session = makeSession(engine: engine)
        await session.connect(phone: "0901234567")
        #expect(session.status == .connected)
        await engine.disconnect()
        await waitUntil { session.status == .idle }
        #expect(session.status == .idle)
    }
}

// MARK: Refresh vs logout

private final class GatedRefresher: @unchecked Sendable {
    // Safe: every access goes through `lock`.
    private let lock = NSLock()
    private var _calls = 0
    private var gate: CheckedContinuation<Void, Never>?
    var calls: Int { lock.withLock { _calls } }
    var waiting: Bool { lock.withLock { gate != nil } }

    func refresh() async {
        await withCheckedContinuation { c in lock.withLock { _calls += 1; gate = c } }
    }

    func release() { lock.withLock { let g = gate; gate = nil; return g }?.resume() }
}

/// 401 for every token except `valid`; optional delay before answering.
private final class TokenTransport: HTTPTransport, @unchecked Sendable {
    private let lock = NSLock()
    private var _sent: [String?] = []
    let valid: String
    let delay: Duration
    init(valid: String, delay: Duration = .milliseconds(5)) { self.valid = valid; self.delay = delay }
    var sent: [String?] { lock.withLock { _sent } }

    func send(_ request: URLRequest) async throws -> (Data, HTTPURLResponse) {
        let auth = request.value(forHTTPHeaderField: "Authorization")
        lock.withLock { _sent.append(auth) }
        try await Task.sleep(for: delay)
        let ok = auth == "Bearer \(valid)"
        return (Data("{}".utf8), HTTPURLResponse(url: request.url!, statusCode: ok ? 200 : 401, httpVersion: nil, headerFields: nil)!)
    }
}

@Suite("Refresh vs logout")
struct RefreshLifecycleTests {
    @Test("a refresh that resolves after logout does not write tokens back")
    func refreshAfterLogout() async throws {
        let store = MemoryTokenStore(AuthTokens(accessToken: "stale", refreshToken: "r1"))
        let gate = GatedRefresher()
        let session = AuthSession(store: store) { _ in
            await gate.refresh()
            return AuthTokens(accessToken: "fresh", refreshToken: "r2")
        }
        let client = HTTPClient(baseURL: URL(string: "http://test/api/v1")!, transport: TokenTransport(valid: "fresh"), session: session, sendsDriverPhone: false)
        let request = Task { try await client.request("GET", "drivers/me/context") }
        for _ in 0..<400 where !gate.waiting { try await Task.sleep(for: .milliseconds(5)) }
        #expect(gate.waiting)

        await session.clear() // user logs out while /auth/refresh is in flight
        gate.release()
        await #expect(throws: APIError.unauthorized) { _ = try await request.value }
        #expect(store.load() == nil)
        #expect(await session.accessToken == nil)
    }

    @Test("a 401 for a token that was already rotated retries with the new token, no second refresh")
    func tokenAlreadyRotated() async throws {
        let store = MemoryTokenStore(AuthTokens(accessToken: "stale", refreshToken: "r1"))
        let refreshes = GatedRefresher()
        let session = AuthSession(store: store) { _ in
            refreshes.release()
            return AuthTokens(accessToken: "other", refreshToken: "rX")
        }
        let transport = TokenTransport(valid: "fresh", delay: .milliseconds(60))
        let client = HTTPClient(baseURL: URL(string: "http://test/api/v1")!, transport: transport, session: session, sendsDriverPhone: false)
        let request = Task { try await client.request("GET", "x") }
        try await Task.sleep(for: .milliseconds(20))
        await session.setTokens(AuthTokens(accessToken: "fresh", refreshToken: "r2")) // another caller refreshed
        _ = try await request.value
        #expect(transport.sent == ["Bearer stale", "Bearer fresh"])
        #expect(store.load() == AuthTokens(accessToken: "fresh", refreshToken: "r2"))
    }

    @Test("network / 5xx refresh failures fail the request but keep the session",
          arguments: [APIError.http(status: 503, detail: nil), APIError.http(status: 500, detail: nil), APIError.network("offline")])
    func transientFailureKeepsTokens(error: APIError) async throws {
        let tokens = AuthTokens(accessToken: "stale", refreshToken: "r1")
        let store = MemoryTokenStore(tokens)
        let session = AuthSession(store: store) { _ in throw error }
        let client = HTTPClient(baseURL: URL(string: "http://test/api/v1")!, transport: TokenTransport(valid: "fresh"), session: session, sendsDriverPhone: false)
        await #expect(throws: error) { _ = try await client.request("GET", "x") }
        #expect(store.load() == tokens)
        #expect(await session.hasRefreshToken)
    }

    @Test("400 / 401 / 403 from /auth/refresh log out",
          arguments: [APIError.http(status: 400, detail: nil), APIError.http(status: 403, detail: nil), APIError.unauthorized])
    func rejectionLogsOut(error: APIError) async throws {
        let store = MemoryTokenStore(AuthTokens(accessToken: "stale", refreshToken: "r1"))
        let session = AuthSession(store: store) { _ in throw error }
        let client = HTTPClient(baseURL: URL(string: "http://test/api/v1")!, transport: TokenTransport(valid: "fresh"), session: session, sendsDriverPhone: false)
        await #expect(throws: APIError.unauthorized) { _ = try await client.request("GET", "x") }
        #expect(store.load() == nil)
    }

    @Test("after one refresh completes, a later 401 can refresh again (slot freed by the task itself)")
    func slotFreedAfterCompletion() async throws {
        let counter = GatedRefresher()
        let store = MemoryTokenStore(AuthTokens(accessToken: "a0", refreshToken: "r0"))
        let session = AuthSession(store: store) { refresh in
            counter.release()
            return AuthTokens(accessToken: refresh == "r0" ? "a1" : "a2", refreshToken: refresh == "r0" ? "r1" : "r2")
        }
        let client = HTTPClient(baseURL: URL(string: "http://test/api/v1")!, transport: TokenTransport(valid: "a1"), session: session, sendsDriverPhone: false)
        _ = try await client.request("GET", "x")
        let client2 = HTTPClient(baseURL: URL(string: "http://test/api/v1")!, transport: TokenTransport(valid: "a2"), session: session, sendsDriverPhone: false)
        _ = try await client2.request("GET", "y")
        #expect(store.load() == AuthTokens(accessToken: "a2", refreshToken: "r2"))
    }
}

// MARK: Turn-by-turn

/// DriverAPI with a scripted `navigation`; everything else is unused here.
final class NavigationStubAPI: DriverAPI, @unchecked Sendable {
    // Safe: `route`/`delay` are set before use and only read afterwards.
    var route: NavigationRoute
    var delay: Duration
    init(route: NavigationRoute, delay: Duration = .zero) { self.route = route; self.delay = delay }

    func navigation(from: LatLng, to: LatLng) async throws -> NavigationRoute {
        try await Task.sleep(for: delay)
        return route
    }
    func setStatus(phone: String, online: Bool) async throws { throw TestError() }
    func context(fresh: Bool) async throws -> DriverContext { throw TestError() }
    func earningsSummary(period: String) async throws -> EarningsSummary { throw TestError() }
    func pushLocation(_ point: LatLng) async throws {}
    func pushLiveLocation(_ point: LatLng, scope: String?) async throws {}
    func trip(id: String) async throws -> Trip { throw TestError() }
    func createTrip(_ input: CreateTripInput) async throws -> Trip { throw TestError() }
    func updateTrip(id: String, status: TripStatus, at: LatLng?) async throws -> Trip { throw TestError() }
    func voiceToken(phone: String, lang: String) async throws -> VoiceToken { throw TestError() }
}

@MainActor
@Suite("Turn-by-turn guards")
struct TurnByTurnGuardTests {
    let origin = LatLng(lat: 21.03, lng: 105.83)
    let destination = LatLng(lat: 21.04, lng: 105.84)

    func route(steps: [RouteStep]) -> NavigationRoute {
        NavigationRoute(distanceKm: 1.5, etaMinutes: 5, trafficNote: nil, polyline: Geo.encodePolyline([origin, destination]), steps: steps)
    }

    @Test("a route with no steps is an error, not an instant arrival")
    func emptySteps() async {
        let nav = TurnByTurn(api: NavigationStubAPI(route: route(steps: [])))
        await nav.start(from: origin, to: destination)
        nav.update(position: origin)
        #expect(nav.state == .error)
    }

    @Test("a route that arrives after stop() is ignored")
    func routeAfterStop() async {
        let step = RouteStep(instruction: "", maneuver: "straight", distanceM: 1500, durationS: 300, startLocation: origin, endLocation: destination)
        let nav = TurnByTurn(api: NavigationStubAPI(route: route(steps: [step]), delay: .milliseconds(80)))
        let start = Task { await nav.start(from: origin, to: destination) }
        await waitUntil { nav.state == .loading }
        nav.stop()
        await start.value
        #expect(nav.state == .idle)
        #expect(nav.route == nil)
        #expect(nav.path.isEmpty)
    }
}

// MARK: Sign-out teardown

@MainActor
@Suite("Sign-out teardown")
struct SignOutTests {
    func makeModel() -> AppModel {
        let backend = DemoBackend(latency: .zero)
        let session = AuthSession(store: MemoryTokenStore(AuthTokens(accessToken: "demo-access", refreshToken: "demo-refresh"))) { _ in
            AuthTokens(accessToken: "demo-access", refreshToken: "demo-refresh")
        }
        let config = AppConfig(tripServiceURL: URL(string: "http://localhost:8002/api/v1")!, authServiceURL: URL(string: "http://localhost:8003/api/v1")!,
                               webSocketURL: URL(string: "ws://localhost:8002/ws")!, goongMapsKey: nil, launch: LaunchOptions(arguments: ["-demo"]))
        return AppModel(config: config, auth: backend, api: backend, session: session, prefs: Preferences(defaults: UserDefaults(suiteName: "test-\(UUID())")!),
                        voiceEngine: FakeVoiceEngine(), socket: DemoDispatchSocket(), audio: FillerAudio(enabled: false))
    }

    @Test("logout stops navigation and background tracking")
    func logoutStopsNavigation() async {
        let model = makeModel()
        await model.bootstrap()
        #expect(model.location.backgroundTracking) // demo driver is online
        await model.navigation.start(from: LatLng(lat: 21.03, lng: 105.82), to: LatLng(lat: 21.04, lng: 105.83))
        #expect(model.navigation.state == .active)

        await model.logout()
        #expect(model.phase == .signedOut)
        #expect(model.navigation.state == .idle)
        #expect(model.location.backgroundTracking == false)
    }
}
