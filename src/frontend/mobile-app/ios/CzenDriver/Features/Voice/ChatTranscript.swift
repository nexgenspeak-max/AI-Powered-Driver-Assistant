import Foundation
import Observation

/// One chat bubble (`assistantChatStore.ts` ChatMessage).
struct ChatMessage: Equatable, Identifiable, Sendable {
    enum Who: String, Sendable { case me, bot, customer }
    let id: UUID
    var who: Who
    var msg: String
    var streaming: Bool
    var segmentId: String?

    init(id: UUID = UUID(), who: Who, msg: String, streaming: Bool = false, segmentId: String? = nil) {
        self.id = id
        self.who = who
        self.msg = msg
        self.streaming = streaming
        self.segmentId = segmentId
    }
}

/// Pure transcript merging, ported verbatim from `assistantChatStore.ts`.
enum TranscriptMerge {
    static func normalize(_ text: String) -> String {
        var t = text.trimmingCharacters(in: .whitespacesAndNewlines)
            .split(whereSeparator: { $0.isWhitespace }).joined(separator: " ")
        while let last = t.last, ".!?…".contains(last) { t.removeLast() }
        return t.lowercased()
    }

    static func isGrowing(_ prev: String, _ next: String) -> Bool {
        let a = prev.trimmingCharacters(in: .whitespacesAndNewlines)
        let b = next.trimmingCharacters(in: .whitespacesAndNewlines)
        if a.isEmpty || b.isEmpty { return false }
        return b.hasPrefix(a) || a.hasPrefix(b)
    }

    static func equivalent(_ prev: String, _ next: String) -> Bool {
        if isGrowing(prev, next) { return true }
        let a = normalize(prev), b = normalize(next)
        return !a.isEmpty && a == b
    }

    static func findBubbleIndex(_ chats: [ChatMessage], who: ChatMessage.Who, msg: String, segmentId: String?) -> Int? {
        if let segmentId {
            if let i = chats.lastIndex(where: { $0.who == who && $0.segmentId == segmentId }) { return i }
        }
        if let last = chats.last, last.who == who, last.streaming || equivalent(last.msg, msg) {
            return chats.count - 1
        }
        // Duplicate transcription stream (same utterance, new segment id) within the last 4 bubbles.
        var i = chats.count - 1
        while i >= 0 && chats.count - 1 - i < 4 {
            let bubble = chats[i]
            if bubble.who != who { break }
            if bubble.streaming || equivalent(bubble.msg, msg) { return i }
            i -= 1
        }
        return nil
    }

    static func upsert(_ chats: [ChatMessage], who: ChatMessage.Who, msg: String, isFinal: Bool, segmentId: String?) -> [ChatMessage] {
        guard let idx = findBubbleIndex(chats, who: who, msg: msg, segmentId: segmentId) else {
            return chats + [ChatMessage(who: who, msg: msg, streaming: !isFinal, segmentId: segmentId)]
        }
        let prev = chats[idx]
        let next = ChatMessage(id: prev.id, who: who, msg: msg, streaming: !isFinal, segmentId: segmentId ?? prev.segmentId)
        if prev == next { return chats }
        var out = chats
        out[idx] = next
        return out
    }
}

/// Drops a final transcript whose normalised text repeated within 3 s (voiceSessionStore dedupe),
/// and hides raw tool ids spoken by the agent.
struct TranscriptDeduper {
    private var recent: [String: TimeInterval] = [:]
    static let window: TimeInterval = 3

    static func isRawToolToken(_ text: String) -> Bool {
        let token = text.trimmingCharacters(in: .whitespacesAndNewlines)
        if token.isEmpty || token.contains(where: { $0.isWhitespace }) { return false }
        guard token.contains("_"), let first = token.unicodeScalars.first, ("a"..."z").contains(first) else { return false }
        return token.unicodeScalars.allSatisfy { ("a"..."z").contains($0) || ("0"..."9").contains($0) || $0 == "_" }
    }

    /// Returns true when the final message should be emitted.
    mutating func admit(from: String, text: String, now: TimeInterval) -> Bool {
        let key = "\(from):\(TranscriptMerge.normalize(text))"
        if let prev = recent[key], now - prev < Self.window { return false }
        recent[key] = now
        recent = recent.filter { now - $0.value < Self.window }
        return true
    }
}

/// In-memory chat history + panel visibility (`assistantChatStore`).
@MainActor
@Observable
final class ChatStore {
    var chats: [ChatMessage] = []
    var panelOpen = false

    func openPanel() { panelOpen = true }
    func closePanel() { panelOpen = false }
    func addUserMessage(_ msg: String) { chats.append(ChatMessage(who: .me, msg: msg)) }
    func addBotMessage(_ msg: String) { chats.append(ChatMessage(who: .bot, msg: msg)) }
    func upsert(who: ChatMessage.Who, msg: String, isFinal: Bool, segmentId: String? = nil) {
        let next = TranscriptMerge.upsert(chats, who: who, msg: msg, isFinal: isFinal, segmentId: segmentId)
        if next != chats { chats = next }
    }
    func clear() { chats = [] }
}
