import Foundation
import os

/// Realtime dispatch events (`useDispatchSocket.ts`): open only while online, receive-only,
/// reconnect 3 s after any close.
enum DispatchEvent: Equatable, Sendable {
    case opened
    case tripOffer(tripId: String)
    case tripConfirmed
    case invalidate(String)
}

@MainActor
protocol DispatchSocket: AnyObject {
    var onEvent: ((DispatchEvent) -> Void)? { get set }
    func start(phone: String)
    func stop()
}

/// One WebSocket connection. `onOpen` fires on the real handshake (not on the first frame).
protocol WebSocketConnection: AnyObject, Sendable {
    func receive() async throws -> URLSessionWebSocketTask.Message
    /// Resolves on the pong; throws when the ping fails or no pong arrives in time.
    func sendPing() async throws
    func close()
}

/// Waits between reconnects (injectable so tests can record the schedule).
struct Sleeper: Sendable {
    let run: @Sendable (Duration) async -> Void
    static let live = Sleeper { try? await Task.sleep(for: $0) }
}

/// The server refused the WebSocket upgrade (HTTP 401 on the handshake).
enum DispatchSocketError: Error, Equatable { case unauthorized }

typealias WebSocketFactory = @MainActor (_ url: URL, _ onOpen: @escaping @Sendable () -> Void) -> WebSocketConnection

/// Realtime dispatch socket: `.opened` on the handshake, a ping every 20 s (a failed ping counts
/// as a close), reconnect 3 s after any close. A handshake rejected with 401 backs off instead:
/// 3 s → 6 → 12 … capped at 60 s, back to 3 s once a handshake succeeds.
@MainActor
final class LiveDispatchSocket: DispatchSocket {
    var onEvent: ((DispatchEvent) -> Void)?
    private let baseURL: URL
    private let factory: WebSocketFactory
    private let keepAlive: Duration
    private let reconnectDelay: Duration
    private let maxBackoff: Duration
    private let sleep: Sleeper
    private var connection: WebSocketConnection?
    private var connectionID = 0
    private var loop: Task<Void, Never>?
    /// Consecutive 401 handshakes since the last successful open.
    private var unauthorizedStreak = 0
    private let log = Logger(subsystem: "com.chinhtruongba.driverapp", category: "ws")

    init(baseURL: URL, keepAlive: Duration = .seconds(20), reconnectDelay: Duration = .seconds(3), maxBackoff: Duration = .seconds(60),
         sleep: Sleeper = .live,
         factory: @escaping WebSocketFactory = { url, onOpen in URLSessionWebSocketConnection(url: url, onOpen: onOpen) }) {
        self.baseURL = baseURL
        self.maxBackoff = maxBackoff
        self.sleep = sleep
        self.keepAlive = keepAlive
        self.reconnectDelay = reconnectDelay
        self.factory = factory
    }

    func start(phone: String) {
        stop()
        unauthorizedStreak = 0
        loop = Task { [weak self, sleep] in
            while !Task.isCancelled {
                guard let delay = await self?.runOnce(phone: phone) else { return }
                await sleep.run(delay)
            }
        }
    }

    func stop() {
        loop?.cancel()
        loop = nil
        connectionID += 1
        connection?.close()
        connection = nil
    }

    /// Delay before retry number `attempt` (1-based) after consecutive 401 handshakes: `base · 2^(attempt−1)`, capped.
    nonisolated static func unauthorizedBackoff(attempt: Int, base: Duration, max: Duration) -> Duration {
        let factor = 1 << Swift.min(Swift.max(attempt - 1, 0), 20)
        return Swift.min(base * factor, max)
    }

    /// One connection's lifetime; returns how long to wait before the next attempt.
    private func runOnce(phone: String) async -> Duration {
        var comps = URLComponents(url: baseURL, resolvingAgainstBaseURL: false)
        comps?.queryItems = [URLQueryItem(name: "role", value: "driver"), URLQueryItem(name: "id", value: phone)]
        guard let url = comps?.url, !Task.isCancelled else { return reconnectDelay }
        connectionID += 1
        let id = connectionID
        let opened = OpenFlag()
        let conn = factory(url) { [weak self] in
            opened.set()
            Task { @MainActor in
                guard let self, self.connectionID == id else { return }
                self.onEvent?(.opened)
            }
        }
        connection = conn
        let log = self.log
        let keepAlive = self.keepAlive
        let pinger = Task {
            while !Task.isCancelled {
                try? await Task.sleep(for: keepAlive)
                if Task.isCancelled { return }
                do { try await conn.sendPing() } catch {
                    if Task.isCancelled { return }
                    log.notice("socket ping failed; closing")
                    conn.close() // receive() throws → reconnect
                    return
                }
            }
        }
        defer {
            pinger.cancel()
            conn.close()
            if connectionID == id { connection = nil }
        }
        var rejected = false
        while !Task.isCancelled {
            do {
                let message = try await conn.receive()
                guard connectionID == id else { break }
                let data: Data
                switch message {
                case let .string(s): data = Data(s.utf8)
                case let .data(d): data = d
                @unknown default: continue
                }
                if let event = Self.parse(data) { onEvent?(event) }
            } catch DispatchSocketError.unauthorized {
                rejected = true
                break
            } catch {
                log.notice("socket closed; reconnecting")
                break
            }
        }
        if opened.isSet { unauthorizedStreak = 0 }
        guard rejected, !opened.isSet else { return reconnectDelay }
        unauthorizedStreak += 1
        let delay = Self.unauthorizedBackoff(attempt: unauthorizedStreak, base: reconnectDelay, max: maxBackoff)
        log.notice("socket handshake rejected (401); retry in \(delay.components.seconds, privacy: .public)s")
        return delay
    }

    /// Set from the URLSession delegate queue when the handshake completes.
    private final class OpenFlag: @unchecked Sendable {
        // Safe: every access goes through `lock`.
        private let lock = NSLock()
        private var value = false
        func set() { lock.withLock { value = true } }
        var isSet: Bool { lock.withLock { value } }
    }

    /// `{event, data}` frames.
    nonisolated static func parse(_ data: Data) -> DispatchEvent? {
        guard let obj = try? JSONSerialization.jsonObject(with: data) as? [String: Any], let event = obj["event"] as? String else { return nil }
        let payload = obj["data"] as? [String: Any]
        switch event {
        case "trip_offer":
            guard let id = payload?["trip_id"] as? String else { return .invalidate(event) }
            return .tripOffer(tripId: id)
        case "trip_confirmed": return .tripConfirmed
        case "schedule_updated", "pending_nudge": return .invalidate(event)
        default: return .invalidate(event)
        }
    }
}

/// `URLSessionWebSocketTask` with its own delegate session so the handshake is observable.
final class URLSessionWebSocketConnection: NSObject, WebSocketConnection, URLSessionWebSocketDelegate, @unchecked Sendable {
    // @unchecked: `task`/`session` are set once in init; `onOpen` is immutable and @Sendable.
    private let onOpen: @Sendable () -> Void
    private var session: URLSession!
    private var task: URLSessionWebSocketTask!
    private let pongTimeout: Duration

    init(url: URL, onOpen: @escaping @Sendable () -> Void, pongTimeout: Duration = .seconds(10)) {
        self.onOpen = onOpen
        self.pongTimeout = pongTimeout
        super.init()
        session = URLSession(configuration: .default, delegate: self, delegateQueue: nil)
        task = session.webSocketTask(with: url)
        task.resume()
    }

    func urlSession(_ session: URLSession, webSocketTask: URLSessionWebSocketTask, didOpenWithProtocol protocol: String?) {
        onOpen()
    }

    /// A failed upgrade whose HTTP response was 401 surfaces as `DispatchSocketError.unauthorized`.
    func receive() async throws -> URLSessionWebSocketTask.Message {
        do {
            return try await task.receive()
        } catch {
            if (task.response as? HTTPURLResponse)?.statusCode == 401 { throw DispatchSocketError.unauthorized }
            throw error
        }
    }

    func sendPing() async throws {
        let once = ResumeOnce()
        let timeout = pongTimeout
        try await withCheckedThrowingContinuation { (cont: CheckedContinuation<Void, Error>) in
            once.set(cont)
            task.sendPing { error in once.resume(error) }
            Task {
                try? await Task.sleep(for: timeout)
                once.resume(URLError(.timedOut))
            }
        }
    }

    func close() {
        task.cancel(with: .goingAway, reason: nil)
        session.invalidateAndCancel()
    }

    /// Resumes a continuation at most once (pong handler vs timeout).
    private final class ResumeOnce: @unchecked Sendable {
        private let lock = NSLock()
        private var cont: CheckedContinuation<Void, Error>?
        func set(_ c: CheckedContinuation<Void, Error>) { lock.withLock { cont = c } }
        func resume(_ error: Error?) {
            let c: CheckedContinuation<Void, Error>? = lock.withLock { defer { cont = nil }; return cont }
            if let error { c?.resume(throwing: error) } else { c?.resume() }
        }
    }
}

/// Demo: no network; emits a trip offer when asked.
@MainActor
final class DemoDispatchSocket: DispatchSocket {
    var onEvent: ((DispatchEvent) -> Void)?
    var offerOnStart: String?

    func start(phone: String) {
        onEvent?(.opened)
        if let id = offerOnStart {
            offerOnStart = nil
            Task { [weak self] in
                try? await Task.sleep(for: .milliseconds(900))
                self?.onEvent?(.tripOffer(tripId: id))
            }
        }
    }

    func stop() {}
}
