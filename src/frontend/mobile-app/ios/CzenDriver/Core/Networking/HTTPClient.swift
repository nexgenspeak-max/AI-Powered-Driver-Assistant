import Foundation
import os

enum APIError: Error, Equatable, Sendable {
    case http(status: Int, detail: String?)
    case unauthorized
    case network(String)
    case decoding(String)
    case cancelled

    /// The server's `detail`, used for user-facing alerts.
    var detail: String? {
        if case let .http(_, detail) = self { return detail }
        return nil
    }

    var status: Int? {
        if case let .http(status, _) = self { return status }
        return nil
    }
}

protocol HTTPTransport: Sendable {
    func send(_ request: URLRequest) async throws -> (Data, HTTPURLResponse)
}

struct URLSessionTransport: HTTPTransport {
    let session: URLSession

    init() {
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 20
        config.waitsForConnectivity = false
        session = URLSession(configuration: config)
    }

    func send(_ request: URLRequest) async throws -> (Data, HTTPURLResponse) {
        do {
            let (data, response) = try await session.data(for: request)
            guard let http = response as? HTTPURLResponse else { throw APIError.network("no HTTP response") }
            return (data, http)
        } catch let error as URLError where error.code == .cancelled {
            throw APIError.cancelled
        } catch is CancellationError {
            throw APIError.cancelled
        } catch let error as APIError {
            throw error
        } catch {
            throw APIError.network(error.localizedDescription)
        }
    }
}

/// Holds the tokens and collapses concurrent 401s into one `/auth/refresh` (the server rotates
/// refresh tokens, so a second concurrent refresh would fail against a consumed token).
///
/// Every `clear()` starts a new session generation and cancels the refresh in flight, so a
/// refresh that resolves after a logout can never write tokens back.
actor AuthSession {
    typealias Refresher = @Sendable (_ refreshToken: String) async throws -> AuthTokens

    enum RefreshOutcome: Equatable, Sendable {
        /// A usable access token (fresh, or already rotated by another caller).
        case token(String)
        /// The session is gone (refresh rejected, or logged out meanwhile).
        case loggedOut
        /// Transient failure (network, 5xx): tokens kept, the request fails with this error.
        case failed(APIError)
    }

    private let store: TokenStore
    private let refresher: Refresher
    private var tokens: AuthTokens?
    private var refreshTask: Task<RefreshOutcome, Never>?
    private var refreshTaskID: UUID?
    private var generation = 0
    private(set) var driverPhone: String?
    private var logoutContinuations: [UUID: AsyncStream<Void>.Continuation] = [:]

    init(store: TokenStore, refresher: @escaping Refresher) {
        self.store = store
        self.refresher = refresher
        self.tokens = store.load()
    }

    var accessToken: String? { tokens?.accessToken }
    var hasRefreshToken: Bool { tokens?.refreshToken.isEmpty == false }

    func setTokens(_ tokens: AuthTokens) {
        self.tokens = tokens
        store.save(tokens)
    }

    func setDriverPhone(_ phone: String?) { driverPhone = phone }

    /// Clears tokens without broadcasting (explicit logout path) and invalidates any refresh in flight.
    func clear() {
        generation += 1
        refreshTask?.cancel()
        refreshTask = nil
        refreshTaskID = nil
        tokens = nil
        driverPhone = nil
        store.save(nil)
    }

    /// Emits whenever a failed refresh forces a logout.
    func logoutEvents() -> AsyncStream<Void> {
        let id = UUID()
        let (stream, continuation) = AsyncStream<Void>.makeStream()
        logoutContinuations[id] = continuation
        continuation.onTermination = { [weak self] _ in
            Task { await self?.removeContinuation(id) }
        }
        return stream
    }

    private func removeContinuation(_ id: UUID) { logoutContinuations[id] = nil }

    /// `/auth/refresh` rejected the refresh token: only 400 / 401 / 403 end the session.
    nonisolated static func isRejection(_ error: Error) -> Bool {
        switch error as? APIError {
        case .unauthorized: return true
        case let .http(status, _): return [400, 401, 403].contains(status)
        default: return false
        }
    }

    /// Single-flight refresh: every caller awaits the same task. `staleToken` is the access token
    /// the failed request carried; if the session already moved past it, that newer token is
    /// returned without another refresh.
    func refreshAccessToken(staleToken: String? = nil) async -> RefreshOutcome {
        if let current = tokens?.accessToken, let staleToken, current != staleToken { return .token(current) }
        if let task = refreshTask { return await task.value }
        guard let refresh = tokens?.refreshToken, !refresh.isEmpty else {
            forceLogout()
            return .loggedOut
        }
        let gen = generation
        let id = UUID()
        let task = Task<RefreshOutcome, Never> { await self.performRefresh(refresh, gen: gen, id: id) }
        refreshTask = task
        refreshTaskID = id
        return await task.value
    }

    private func performRefresh(_ refresh: String, gen: Int, id: UUID) async -> RefreshOutcome {
        defer {
            // Only this task's own completion frees the slot, and only if it still owns it.
            if refreshTaskID == id { refreshTask = nil; refreshTaskID = nil }
        }
        do {
            let next = try await refresher(refresh)
            guard gen == generation, !Task.isCancelled else { return .loggedOut }
            setTokens(next)
            return .token(next.accessToken)
        } catch {
            guard gen == generation, !Task.isCancelled else { return .loggedOut }
            if Self.isRejection(error) {
                forceLogout()
                return .loggedOut
            }
            return .failed((error as? APIError) ?? .network(error.localizedDescription))
        }
    }

    private func forceLogout() {
        clear()
        for c in logoutContinuations.values { c.yield(()) }
    }
}

/// JSON client for one base URL. Adds the bearer token (and `X-Driver-Phone` for the
/// external-api service), replays a request once after a 401 + successful refresh.
final class HTTPClient: Sendable {
    let baseURL: URL
    private let transport: HTTPTransport
    private let session: AuthSession
    private let sendsDriverPhone: Bool
    private static let log = Logger(subsystem: "com.chinhtruongba.driverapp", category: "api")

    init(baseURL: URL, transport: HTTPTransport, session: AuthSession, sendsDriverPhone: Bool) {
        self.baseURL = baseURL
        self.transport = transport
        self.session = session
        self.sendsDriverPhone = sendsDriverPhone
    }

    func request(_ method: String, _ path: String, query: [URLQueryItem] = [], body: (any Encodable & Sendable)? = nil, authorized: Bool = true) async throws -> Data {
        var components = URLComponents(url: baseURL.appendingPathComponent(path), resolvingAgainstBaseURL: false)
        if !query.isEmpty { components?.queryItems = query }
        guard let url = components?.url else { throw APIError.network("bad url") }
        var req = URLRequest(url: url)
        req.httpMethod = method
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.setValue("application/json", forHTTPHeaderField: "Accept")
        if let body { req.httpBody = try JSONCoding.encoder().encode(body) }
        if sendsDriverPhone, let phone = await session.driverPhone { req.setValue(phone, forHTTPHeaderField: "X-Driver-Phone") }

        var attempt = req
        let sentToken = authorized ? await session.accessToken : nil
        if let sentToken { attempt.setValue("Bearer \(sentToken)", forHTTPHeaderField: "Authorization") }
        let (data, response) = try await transport.send(attempt)
        if response.statusCode == 401, authorized, await session.hasRefreshToken {
            let fresh: String
            switch await session.refreshAccessToken(staleToken: sentToken) {
            case let .token(token): fresh = token
            case .loggedOut: throw APIError.unauthorized
            case let .failed(error): throw error
            }
            var retry = req
            retry.setValue("Bearer \(fresh)", forHTTPHeaderField: "Authorization")
            let (d2, r2) = try await transport.send(retry)
            return try Self.check(d2, r2, path: path)
        }
        return try Self.check(data, response, path: path)
    }

    func decode<T: Decodable>(_ type: T.Type, _ method: String, _ path: String, query: [URLQueryItem] = [], body: (any Encodable & Sendable)? = nil, authorized: Bool = true) async throws -> T {
        let data = try await request(method, path, query: query, body: body, authorized: authorized)
        do {
            return try JSONCoding.decoder().decode(T.self, from: data)
        } catch {
            Self.log.error("decode \(path, privacy: .public): \(String(describing: error), privacy: .public)")
            throw APIError.decoding(String(describing: error))
        }
    }

    private static func check(_ data: Data, _ response: HTTPURLResponse, path: String) throws -> Data {
        guard (200..<300).contains(response.statusCode) else {
            let detail = (try? JSONSerialization.jsonObject(with: data) as? [String: Any])?["detail"] as? String
            log.notice("\(path, privacy: .public) -> \(response.statusCode)")
            if response.statusCode == 401 { throw APIError.unauthorized }
            throw APIError.http(status: response.statusCode, detail: detail)
        }
        return data
    }
}
