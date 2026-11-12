import Contacts
import Foundation
import LiveKit

/// Live voice room on the LiveKit Swift SDK — same topics, RPC and payloads as the RN app.
@MainActor
final class LiveKitVoiceEngine: VoiceEngine {
    var onEvent: ((VoiceEvent) -> Void)?
    private var room: Room?
    private var bridge: LiveKitRoomBridge?
    private var roomGeneration = 0
    private let contacts: ContactsSearching

    init(contacts: ContactsSearching = DeviceContactsSearch()) { self.contacts = contacts }

    var isConnected: Bool {
        guard let room else { return false }
        switch room.connectionState {
        case .connected, .reconnecting, .connecting: return true
        default: return false
        }
    }

    func connect(url: String, token: String) async throws {
        if let old = room { await old.disconnect(); room = nil }
        roomGeneration += 1
        let gen = roomGeneration
        // Events from a room we already replaced or dropped are ignored.
        let bridge = LiveKitRoomBridge { [weak self] event in
            Task { @MainActor in
                guard let self, self.roomGeneration == gen else { return }
                self.onEvent?(event)
            }
        }
        let room = Room(delegate: bridge)
        self.room = room
        self.bridge = bridge
        let sink = bridge.sink
        let contacts = self.contacts

        let handler: TextStreamHandler = { reader, identity in
            let isLocal = identity == room.localParticipant.identity
            let info = reader.info
            let segmentId = info.attributes["lk.segment_id"]
            try await TextStreamTranscript.consume(reader, topic: info.topic, attributes: info.attributes) { text, isFinal in
                sink(.text(text, identity: identity.stringValue, isLocal: isLocal, isFinal: isFinal, segmentId: segmentId))
            }
        }
        try await room.registerTextStreamHandler(for: "lk.transcription", onNewStream: handler)
        try await room.registerTextStreamHandler(for: "lk.chat", onNewStream: handler)
        try await room.registerRpcMethod("search_contacts") { data in
            await contacts.rpcResponse(payload: data.payload)
        }
        do {
            try await room.connect(url: url, token: token)
        } catch {
            if Task.isCancelled || self.room !== room { throw CancellationError() }
            throw error
        }
        // `disconnect()` ran while the join was in flight (it forgot this room): the join still
        // completed, so leave the room now instead of keeping an orphaned live connection.
        if self.room !== room {
            await room.disconnect()
            throw CancellationError()
        }
    }

    func setMicrophone(enabled: Bool) async throws -> Bool {
        guard let room else { return false }
        let pub = try await room.localParticipant.setMicrophone(enabled: enabled)
        guard enabled else { return true }
        return pub != nil && !(pub?.isMuted ?? true)
    }

    func sendChat(_ text: String) async throws {
        guard let room else { return }
        _ = try await room.localParticipant.sendText(text, for: "lk.chat")
    }

    func publish(topic: String, json: [String: String]) async throws {
        guard let room else { return }
        let data = try JSONSerialization.data(withJSONObject: json)
        try await room.localParticipant.publish(data: data, options: DataPublishOptions(topic: topic, reliable: true))
    }

    func disconnect() async {
        guard let room else { return }
        roomGeneration += 1 // the bridge's own didDisconnect for this room is now stale
        self.room = nil
        bridge = nil
        await room.disconnect()
        onEvent?(.disconnected)
    }
}

/// Text-stream → transcript updates. `lk.transcription` streams carry their finality in the
/// header attribute `lk.transcription_final` ("false" = interim); chunks render as a streaming
/// bubble and only a final stream ends with an `isFinal` update (dedupe, `call_transcript`).
/// `lk.chat` messages are always final.
enum TextStreamTranscript {
    static func isFinal(topic: String, attributes: [String: String]) -> Bool {
        guard topic == "lk.transcription" else { return true }
        return attributes["lk.transcription_final"] != "false"
    }

    static func consume<S: AsyncSequence>(_ chunks: S, topic: String, attributes: [String: String],
                                          emit: (String, Bool) -> Void) async throws where S.Element == String {
        var text = ""
        guard topic == "lk.transcription" else {
            for try await chunk in chunks { text += chunk }
            emit(text, true)
            return
        }
        for try await chunk in chunks {
            text += chunk
            emit(text, false)
        }
        if isFinal(topic: topic, attributes: attributes) { emit(text, true) }
    }
}

/// RoomDelegate callbacks arrive off the main actor; forward them as `VoiceEvent`s.
final class LiveKitRoomBridge: NSObject, RoomDelegate, Sendable {
    let sink: @Sendable (VoiceEvent) -> Void

    init(sink: @escaping @Sendable (VoiceEvent) -> Void) { self.sink = sink }

    func room(_ room: Room, participant: RemoteParticipant?, didReceiveData data: Data, forTopic topic: String, encryptionType: EncryptionType) {
        sink(.data(topic: topic, payload: data))
    }

    func room(_ room: Room, didUpdateSpeakingParticipants participants: [Participant]) {
        let local = room.localParticipant.identity
        let agent = participants.first { $0.identity != local }
        sink(.agentLevel(Double(agent?.audioLevel ?? 0)))
    }

    func room(_ room: Room, didDisconnectWithError error: LiveKitError?) {
        sink(.disconnected)
    }
}

/// `search_contacts` RPC backend (`contactsSearch.ts`).
protocol ContactsSearching: Sendable {
    func rpcResponse(payload: String) async -> String
}

struct DeviceContactsSearch: ContactsSearching {
    func rpcResponse(payload: String) async -> String {
        do {
            guard let obj = try JSONSerialization.jsonObject(with: Data(payload.utf8)) as? [String: Any],
                  let query = obj["query"] as? String else { return Self.json(["error": "invalid_payload"]) }
            let matches = try await search(query)
            return Self.json(["matches": matches])
        } catch {
            return Self.json(["error": (error as? ContactsError)?.rawValue ?? error.localizedDescription])
        }
    }

    enum ContactsError: String, Error { case permissionDenied = "permission_denied" }

    func search(_ query: String) async throws -> [[String: String]] {
        let store = CNContactStore()
        let status = CNContactStore.authorizationStatus(for: .contacts)
        if status == .notDetermined {
            guard try await store.requestAccess(for: .contacts) else { throw ContactsError.permissionDenied }
        } else if status != .authorized && status != .limited {
            throw ContactsError.permissionDenied
        }
        let keys = [CNContactGivenNameKey, CNContactFamilyNameKey, CNContactPhoneNumbersKey] as [CNKeyDescriptor]
        let predicate = CNContact.predicateForContacts(matchingName: query)
        let found = try store.unifiedContacts(matching: predicate, keysToFetch: keys)
        return found.compactMap { c -> [String: String]? in
            guard let number = c.phoneNumbers.first?.value.stringValue else { return nil }
            let name = [c.givenName, c.familyName].filter { !$0.isEmpty }.joined(separator: " ")
            return ["name": name, "phone_number": number]
        }.prefix(5).map { $0 }
    }

    static func json(_ obj: [String: Any]) -> String {
        (try? JSONSerialization.data(withJSONObject: obj)).flatMap { String(data: $0, encoding: .utf8) } ?? "{}"
    }
}
