import Foundation
import Testing
@testable import CzenDriver

/// Scripted transport: 401 for the stale token, 200 for the fresh one.
private final class StubTransport: HTTPTransport, @unchecked Sendable {
    // Safe: every access goes through `lock`.
    private let lock = NSLock()
    private var _requests: [URLRequest] = []
    let validToken: String

    init(validToken: String) { self.validToken = validToken }

    var requests: [URLRequest] { lock.withLock { _requests } }

    func send(_ request: URLRequest) async throws -> (Data, HTTPURLResponse) {
        lock.withLock { _requests.append(request) }
        try await Task.sleep(for: .milliseconds(10))
        let auth = request.value(forHTTPHeaderField: "Authorization")
        let ok = auth == "Bearer \(validToken)"
        let response = HTTPURLResponse(url: request.url!, statusCode: ok ? 200 : 401, httpVersion: nil, headerFields: nil)!
        let body = ok ? #"{"period":"week","total_earnings":100,"trip_count":2,"currency":"VND"}"# : #"{"detail":"expired"}"#
        return (Data(body.utf8), response)
    }
}

private actor Counter {
    var value = 0
    func increment() { value += 1 }
}

@Suite("Token refresh")
struct TokenRefreshTests {
    @Test("concurrent 401s collapse into one /auth/refresh and every request is replayed")
    func singleFlight() async throws {
        let counter = Counter()
        let store = MemoryTokenStore(AuthTokens(accessToken: "stale", refreshToken: "r1"))
        let session = AuthSession(store: store) { refresh in
            #expect(refresh == "r1")
            await counter.increment()
            try await Task.sleep(for: .milliseconds(50))
            return AuthTokens(accessToken: "fresh", refreshToken: "r2")
        }
        let transport = StubTransport(validToken: "fresh")
        let client = HTTPClient(baseURL: URL(string: "http://test/api/v1")!, transport: transport, session: session, sendsDriverPhone: true)
        let api = LiveDriverAPI(http: client)

        let results = try await withThrowingTaskGroup(of: EarningsSummary.self) { group in
            for _ in 0..<5 { group.addTask { try await api.earningsSummary(period: "week") } }
            return try await group.reduce(into: []) { $0.append($1) }
        }

        #expect(results.count == 5)
        #expect(await counter.value == 1)
        #expect(store.load() == AuthTokens(accessToken: "fresh", refreshToken: "r2"))
        #expect(transport.requests.count == 10) // 5 stale + 5 replays
    }

    @Test("a failed refresh logs out and clears the tokens")
    func failedRefreshLogsOut() async throws {
        let store = MemoryTokenStore(AuthTokens(accessToken: "stale", refreshToken: "r1"))
        let session = AuthSession(store: store) { _ in throw APIError.unauthorized }
        let events = await session.logoutEvents()
        let client = HTTPClient(baseURL: URL(string: "http://test/api/v1")!, transport: StubTransport(validToken: "fresh"), session: session, sendsDriverPhone: false)

        await #expect(throws: APIError.unauthorized) {
            _ = try await client.request("GET", "drivers/me/context")
        }
        #expect(store.load() == nil)
        var iterator = events.makeAsyncIterator()
        let event: Void? = await iterator.next()
        #expect(event != nil)
    }

    @Test("X-Driver-Phone is sent on the external-api client only")
    func driverPhoneHeader() async throws {
        let session = AuthSession(store: MemoryTokenStore(AuthTokens(accessToken: "fresh", refreshToken: "r"))) { _ in throw APIError.unauthorized }
        await session.setDriverPhone("0901234567")
        let transport = StubTransport(validToken: "fresh")
        _ = try await HTTPClient(baseURL: URL(string: "http://t/api/v1")!, transport: transport, session: session, sendsDriverPhone: true).request("GET", "x")
        _ = try await HTTPClient(baseURL: URL(string: "http://t/api/v1")!, transport: transport, session: session, sendsDriverPhone: false).request("GET", "y")
        #expect(transport.requests[0].value(forHTTPHeaderField: "X-Driver-Phone") == "0901234567")
        #expect(transport.requests[1].value(forHTTPHeaderField: "X-Driver-Phone") == nil)
    }

    @Test("WebSocket URL derives from the API base")
    func webSocketURL() {
        #expect(AppConfig.deriveWebSocketURL(from: URL(string: "https://api.example.com/api/v1")!).absoluteString == "wss://api.example.com/ws")
        #expect(AppConfig.deriveWebSocketURL(from: URL(string: "http://10.0.0.2:8002/api/v1")!).absoluteString == "ws://10.0.0.2:8002/ws")
    }
}
