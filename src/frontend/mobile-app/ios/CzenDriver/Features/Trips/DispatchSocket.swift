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

typealias WebSocketFactory = @MainActor (_ url: URL, _ onOpen: @escaping @Sendable () -> Void) -> WebSocketConnection

/// Realtime dispatch socket: `.opened` on the handshake, a ping every 20 s (a failed ping counts
/// as a close), reconnect 3 s after any close.
@MainActor
final class LiveDispatchSocket: DispatchSocket {
    var onEvent: ((DispatchEvent) -> Void)?
    private let baseURL: URL
    private let factory: WebSocketFactory
    private let keepAlive: Duration
    private let reconnectDelay: Duration
    private var connection: WebSocketConnection?
    private var connectionID = 0
    private var loop: Task<Void, Never>?
    private let log = Logger(subsystem: "com.chinhtruongba.driverapp", category: "ws")

    init(baseURL: URL, keepAlive: Duration = .seconds(20), reconnectDelay: Duration = .seconds(3),
         factory: @escaping WebSocketFactory = { url, onOpen in URLSessionWebSocketConnection(url: url, onOpen: onOpen) }) {
        self.baseURL = baseURL
        self.keepAlive = keepAlive
        self.reconnectDelay = reconnectDelay
        self.factory = factory
    }

    func start(phone: String) {
        stop()
        loop = Task { [weak self, reconnectDelay] in
            while !Task.isCancelled {
                await self?.runOnce(phone: phone)
                try? await Task.sleep(for: reconnectDelay)
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

    private func runOnce(phone: String) async {
        var comps = URLComponents(url: baseURL, resolvingAgainstBaseURL: false)
        comps?.queryItems = [URLQueryItem(name: "role", value: "driver"), URLQueryItem(name: "id", value: phone)]
        guard let url = comps?.url, !Task.isCancelled else { return }
        connectionID += 1
        let id = connectionID
        let conn = factory(url) { [weak self] in
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
        while !Task.isCancelled {
            do {
                let message = try await conn.receive()
                guard connectionID == id else { return }
                let data: Data
                switch message {
                case let .string(s): data = Data(s.utf8)
                case let .data(d): data = d
                @unknown default: continue
                }
                if let event = Self.parse(data) { onEvent?(event) }
            } catch {
                log.notice("socket closed; reconnecting")
                return
            }
        }
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

    func receive() async throws -> URLSessionWebSocketTask.Message { try await task.receive() }

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
