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

@MainActor
final class LiveDispatchSocket: DispatchSocket {
    var onEvent: ((DispatchEvent) -> Void)?
    private let baseURL: URL
    private var task: URLSessionWebSocketTask?
    private var loop: Task<Void, Never>?
    private let log = Logger(subsystem: "com.chinhtruongba.driverapp", category: "ws")

    init(baseURL: URL) { self.baseURL = baseURL }

    func start(phone: String) {
        stop()
        loop = Task { [weak self] in
            while !Task.isCancelled {
                await self?.runOnce(phone: phone)
                try? await Task.sleep(for: .seconds(3))
            }
        }
    }

    func stop() {
        loop?.cancel()
        loop = nil
        task?.cancel(with: .goingAway, reason: nil)
        task = nil
    }

    private func runOnce(phone: String) async {
        var comps = URLComponents(url: baseURL, resolvingAgainstBaseURL: false)
        comps?.queryItems = [URLQueryItem(name: "role", value: "driver"), URLQueryItem(name: "id", value: phone)]
        guard let url = comps?.url else { return }
        let ws = URLSession.shared.webSocketTask(with: url)
        task = ws
        ws.resume()
        var opened = false
        while !Task.isCancelled {
            do {
                let message = try await ws.receive()
                if !opened { opened = true; onEvent?(.opened) }
                let data: Data
                switch message {
                case let .string(s): data = Data(s.utf8)
                case let .data(d): data = d
                @unknown default: continue
                }
                if let event = Self.parse(data) { onEvent?(event) }
            } catch {
                log.notice("socket closed; reconnecting in 3s")
                break
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
