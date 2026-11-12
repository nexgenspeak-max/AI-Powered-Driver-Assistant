import Foundation
import Security
import Testing
@testable import CzenDriver

// Round-3 review fixes: stale responses after logout, Keychain reinstall wipe / write status,
// mic permission denied, dispatch socket 401 backoff.

// MARK: Stale responses after logout

/// DemoBackend wrapper whose `me` / `updateAccount` / `updateVehicle` can be held until released.
final class GatedAuth: AuthAPI, @unchecked Sendable {
    // Safe: every mutable access goes through `lock`.
    private let lock = NSLock()
    private let backend = DemoBackend(latency: .zero)
    private var held: Set<String> = []
    private var gates: [String: CheckedContinuation<Void, Never>] = [:]

    func hold(_ name: String) { lock.withLock { _ = held.insert(name) } }
    func isWaiting(_ name: String) -> Bool { lock.withLock { gates[name] != nil } }
    func release(_ name: String) {
        let gate: CheckedContinuation<Void, Never>? = lock.withLock {
            held.remove(name)
            return gates.removeValue(forKey: name)
        }
        gate?.resume()
    }

    private func pass(_ name: String) async {
        let mustWait = lock.withLock { held.contains(name) }
        guard mustWait else { return }
        await withCheckedContinuation { c in lock.withLock { gates[name] = c } }
    }

    func login(phone: String, password: String) async throws -> AuthTokens { try await backend.login(phone: phone, password: password) }
    func register(_ input: RegisterInput) async throws -> RegisterResponse { try await backend.register(input) }
    func me() async throws -> AuthUser { await pass("me"); return try await backend.me() }
    func updateAccount(id: String, name: String) async throws -> AuthUser {
        await pass("updateAccount"); return try await backend.updateAccount(id: id, name: name)
    }
    func updateVehicle(id: String, type: String, plate: String, name: String) async throws -> AuthUser {
        await pass("updateVehicle"); return try await backend.updateVehicle(id: id, type: type, plate: plate, name: name)
    }
    func settings(accountId: String) async throws -> AccountSettings { try await backend.settings(accountId: accountId) }
    func patchSettings(accountId: String, _ patch: AccountSettingsPatch) async throws -> AccountSettings {
        try await backend.patchSettings(accountId: accountId, patch)
    }
}

@MainActor
final class RecordingSocket: DispatchSocket {
    var onEvent: ((DispatchEvent) -> Void)?
    private(set) var starts = 0
    private(set) var running = false
    func start(phone: String) { starts += 1; running = true }
    func stop() { running = false }
}

@MainActor
@Suite("Stale responses after logout")
struct StaleResponseTests {
    struct Harness {
        let model: AppModel
        let auth: GatedAuth
        let socket: RecordingSocket
        let session: AuthSession
    }

    func make() -> Harness {
        let auth = GatedAuth()
        let backend = DemoBackend(latency: .zero)
        let socket = RecordingSocket()
        let session = AuthSession(store: MemoryTokenStore(AuthTokens(accessToken: "demo-access", refreshToken: "demo-refresh"))) { _ in
            AuthTokens(accessToken: "demo-access", refreshToken: "demo-refresh")
        }
        let config = AppConfig(tripServiceURL: URL(string: "http://localhost:8002/api/v1")!, authServiceURL: URL(string: "http://localhost:8003/api/v1")!,
                               webSocketURL: URL(string: "ws://localhost:8002/ws")!, goongMapsKey: nil, launch: LaunchOptions(arguments: ["-demo"]))
        let model = AppModel(config: config, auth: auth, api: backend, session: session,
                             prefs: Preferences(defaults: UserDefaults(suiteName: "test-\(UUID())")!),
                             voiceEngine: FakeVoiceEngine(), socket: socket, audio: FillerAudio(enabled: false))
        return Harness(model: model, auth: auth, socket: socket, session: session)
    }

    func expectSignedOutClean(_ h: Harness, startsBefore: Int) async {
        #expect(h.model.phase == .signedOut)
        #expect(h.model.me == nil)
        #expect(await h.session.driverPhone == nil)
        #expect(h.socket.starts == startsBefore)
        #expect(h.socket.running == false)
        #expect(h.model.location.backgroundTracking == false)
    }

    @Test("a /me response that lands after logout is dropped")
    func meAfterLogout() async {
        let h = make()
        h.auth.hold("me")
        let boot = Task { await h.model.bootstrap() }
        await waitUntil { h.auth.isWaiting("me") }
        #expect(h.auth.isWaiting("me"))
        await h.model.logout()
        h.auth.release("me")
        await boot.value
        await expectSignedOutClean(h, startsBefore: 0)
    }

    @Test("updateName resolving after logout does not restore `me` or restart the socket")
    func updateNameAfterLogout() async throws {
        let h = make()
        await h.model.bootstrap()
        #expect(h.model.me != nil)
        let starts = h.socket.starts
        h.auth.hold("updateAccount")
        let update = Task { try await h.model.updateName("Tên mới") }
        await waitUntil { h.auth.isWaiting("updateAccount") }
        await h.model.logout()
        h.auth.release("updateAccount")
        try await update.value
        await expectSignedOutClean(h, startsBefore: starts)
    }

    @Test("updateVehicle resolving after logout does not restore `me` or restart tracking")
    func updateVehicleAfterLogout() async throws {
        let h = make()
        await h.model.bootstrap()
        let starts = h.socket.starts
        h.auth.hold("updateVehicle")
        let update = Task { try await h.model.updateVehicle(type: "car", plate: "30A-12345", name: "Vios") }
        await waitUntil { h.auth.isWaiting("updateVehicle") }
        await h.model.logout()
        h.auth.release("updateVehicle")
        try await update.value
        await expectSignedOutClean(h, startsBefore: starts)
        #expect(h.model.context == nil)
    }
}

// MARK: Keychain

@Suite("Keychain token store", .serialized)
struct KeychainStoreTests {
    @Test("first launch after (re)install wipes leftover Keychain tokens, later launches keep them")
    func reinstallWipe() throws {
        let store = KeychainTokenStore(service: "test-\(UUID())")
        defer { store.save(nil) }
        let defaults = try #require(UserDefaults(suiteName: "test-\(UUID())"))
        let tokens = AuthTokens(accessToken: "a", refreshToken: "r")
        store.save(tokens) // survived an uninstall
        #expect(store.load() == tokens)

        store.resetIfFreshInstall(defaults: defaults)
        #expect(store.load() == nil)

        store.save(tokens)
        store.resetIfFreshInstall(defaults: defaults) // second launch
        #expect(store.load() == tokens)
    }

    @Test("save reports the Keychain status and overwrites in place")
    func saveStatus() {
        let store = KeychainTokenStore(service: "test-\(UUID())")
        defer { store.save(nil) }
        #expect(store.write(AuthTokens(accessToken: "a1", refreshToken: "r1")) == errSecSuccess)
        #expect(store.write(AuthTokens(accessToken: "a2", refreshToken: "r2")) == errSecSuccess)
        #expect(store.load() == AuthTokens(accessToken: "a2", refreshToken: "r2"))
        #expect(store.write(nil) == errSecSuccess)
        #expect(store.load() == nil)
    }
}

// MARK: Mic permission

@MainActor
@Suite("Mic permission")
struct MicPermissionTests {
    @Test("denied mic permission ends the connect in .error with the mic caption, no room")
    func deniedMic() async {
        let engine = FakeVoiceEngine()
        let session = VoiceSession(engine: engine, api: DemoBackend(latency: .zero), prefs: Preferences(defaults: UserDefaults(suiteName: "test-\(UUID())")!),
                                   audio: FillerAudio(enabled: false), settleDelay: .zero, requestMicPermission: { false })
        await session.connect(phone: "0901234567")
        #expect(session.status == .error)
        #expect(session.errorReason == .micDenied)
        #expect(engine.connectCalls == 0)
        #expect(engine.isConnected == false)
        let caption = AssistantChatPanel.caption(status: session.status, isCallActive: false, isMicMuted: false, errorReason: session.errorReason, lang: .vn)
        #expect(caption == AssistantChatPanel.captions[.vn]?["micDenied"])
        #expect(caption.contains("micro"))
    }

    @Test("a later successful connect clears the error reason")
    func grantedAfterDenied() async {
        let engine = FakeVoiceEngine()
        final class Permission { var granted = false }
        let permission = Permission()
        let session = VoiceSession(engine: engine, api: DemoBackend(latency: .zero), prefs: Preferences(defaults: UserDefaults(suiteName: "test-\(UUID())")!),
                                   audio: FillerAudio(enabled: false), settleDelay: .zero, requestMicPermission: { permission.granted })
        await session.connect(phone: "0901234567")
        #expect(session.errorReason == .micDenied)
        permission.granted = true
        await session.connect(phone: "0901234567")
        #expect(session.status == .connected)
        #expect(session.errorReason == nil)
    }
}

// MARK: Dispatch socket backoff

/// Scripted connection: `.reject` throws the 401 handshake error, `.openThenDrop` opens and then drops.
private final class ScriptedConnection: WebSocketConnection, @unchecked Sendable {
    enum Kind { case reject, openThenDrop }
    let kind: Kind
    init(kind: Kind) { self.kind = kind }
    func receive() async throws -> URLSessionWebSocketTask.Message {
        switch kind {
        case .reject: throw DispatchSocketError.unauthorized
        case .openThenDrop: throw URLError(.networkConnectionLost)
        }
    }
    func sendPing() async throws {}
    func close() {}
}

@MainActor
@Suite("Dispatch socket backoff")
struct DispatchBackoffTests {
    @Test("401 backoff doubles from the base delay and caps")
    func schedule() {
        let delays = (1...7).map { LiveDispatchSocket.unauthorizedBackoff(attempt: $0, base: .seconds(3), max: .seconds(60)) }
        #expect(delays == [.seconds(3), .seconds(6), .seconds(12), .seconds(24), .seconds(48), .seconds(60), .seconds(60)])
    }

    @Test("rejected handshakes back off exponentially; a successful open resets the backoff")
    func backoffResetsAfterOpen() async {
        let script: [ScriptedConnection.Kind] = [.reject, .reject, .reject, .reject, .openThenDrop, .reject, .reject]
        var made = 0
        let recorder = DelayRecorder()
        let socket = LiveDispatchSocket(baseURL: URL(string: "ws://test/ws")!, keepAlive: .seconds(60), reconnectDelay: .seconds(3),
                                        maxBackoff: .seconds(60), sleep: Sleeper { await recorder.record($0) }) { _, onOpen in
            let kind = script[min(made, script.count - 1)]
            made += 1
            if kind == .openThenDrop { onOpen() }
            return ScriptedConnection(kind: kind)
        }
        socket.start(phone: "0901234567")
        await waitUntil { recorder.delays.count >= 7 }
        socket.stop()
        #expect(Array(recorder.delays.prefix(7)) == [.seconds(3), .seconds(6), .seconds(12), .seconds(24), .seconds(3), .seconds(3), .seconds(6)])
    }
}

private final class DelayRecorder: @unchecked Sendable {
    // Safe: every access goes through `lock`.
    private let lock = NSLock()
    private var _delays: [Duration] = []
    var delays: [Duration] { lock.withLock { _delays } }
    func record(_ d: Duration) async {
        lock.withLock { _delays.append(d) }
        try? await Task.sleep(for: .milliseconds(2))
    }
}
