import Foundation

/// Scripted voice room for demo mode: connects, then streams a short conversation so the
/// orb, chat bubbles and status chip can be seen without a LiveKit server.
@MainActor
final class DemoVoiceEngine: VoiceEngine {
    var onEvent: ((VoiceEvent) -> Void)?
    private(set) var isConnected = false
    private var script: Task<Void, Never>?
    private let fast: Bool

    init(fast: Bool = false) { self.fast = fast }

    private func pause(_ ms: Int) async throws {
        try await Task.sleep(for: .milliseconds(fast ? ms / 4 : ms))
    }

    func connect(url: String, token: String) async throws {
        try await pause(700)
        isConnected = true
        script = Task { [weak self] in await self?.runScript() }
    }

    private func runScript() async {
        let lines: [(String, Bool, String)] = [
            ("agent", false, "Chào anh Minh! Em là Czen. Anh đang có 2 chuyến đang chạy và 1 chuyến mới chờ nhận."),
            ("driver", true, "Điểm tiếp theo là đâu?"),
            ("agent", false, "Điểm tiếp theo là đón chị Lan ở 54 Liễu Giai, còn khoảng 1,2 km — tầm 5 phút nữa ạ."),
        ]
        do {
            try await pause(600)
            for (i, line) in lines.enumerated() {
                let words = line.2.split(separator: " ")
                var text = ""
                let seg = "demo-seg-\(i)"
                onEvent?(.data(topic: "agent_state", payload: Data(#"{"type":"agent_state","state":"\#(line.1 ? "listening" : "speaking")"}"#.utf8)))
                for word in words {
                    text += (text.isEmpty ? "" : " ") + word
                    onEvent?(.text(text, identity: line.0 == "driver" ? "driver-demo" : "agent-czen", isLocal: line.1, isFinal: false, segmentId: seg))
                    if !line.1 { onEvent?(.agentLevel(Double.random(in: 0.25...0.9))) }
                    try await pause(70)
                }
                onEvent?(.text(text, identity: line.0 == "driver" ? "driver-demo" : "agent-czen", isLocal: line.1, isFinal: true, segmentId: seg))
                onEvent?(.agentLevel(0))
                try await pause(700)
            }
            onEvent?(.data(topic: "agent_state", payload: Data(#"{"type":"agent_state","state":"listening"}"#.utf8)))
        } catch {}
    }

    func setMicrophone(enabled: Bool) async throws -> Bool { true }

    func sendChat(_ text: String) async throws {
        Task { [weak self] in
            try? await self?.pause(900)
            guard let self, self.isConnected else { return }
            self.onEvent?(.text("Dạ, em ghi nhận rồi ạ. Anh cần em hỗ trợ gì thêm không?", identity: "agent-czen", isLocal: false, isFinal: true, segmentId: UUID().uuidString))
        }
    }

    func publish(topic: String, json: [String: String]) async throws {}

    func disconnect() async {
        script?.cancel()
        let was = isConnected
        isConnected = false
        if was { onEvent?(.disconnected) }
    }
}
