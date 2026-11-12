import Contacts
import Foundation
import LiveKit

/// Live voice room on the LiveKit Swift SDK — same topics, RPC and payloads as the RN app.
@MainActor
final class LiveKitVoiceEngine: VoiceEngine {
    var onEvent: ((VoiceEvent) -> Void)?
    private var room: Room?
    private var bridge: LiveKitRoomBridge?
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
        let bridge = LiveKitRoomBridge { [weak self] event in
            Task { @MainActor in self?.onEvent?(event) }
        }
        let room = Room(delegate: bridge)
        self.room = room
        self.bridge = bridge
        let sink = bridge.sink
        let contacts = self.contacts

        let handler: TextStreamHandler = { reader, identity in
            let isLocal = identity == room.localParticipant.identity
            let segmentId = reader.info.attributes["lk.segment_id"]
            if reader.info.topic != "lk.transcription" {
                let text = try await reader.readAll()
                sink(.text(text, identity: identity.stringValue, isLocal: isLocal, isFinal: true, segmentId: segmentId))
                return
            }
            var text = ""
            for try await chunk in reader {
                text += chunk
                sink(.text(text, identity: identity.stringValue, isLocal: isLocal, isFinal: false, segmentId: segmentId))
            }
            // The stream closing ends the segment (the SDK exposes the header attributes only).
            sink(.text(text, identity: identity.stringValue, isLocal: isLocal, isFinal: true, segmentId: segmentId))
        }
        try await room.registerTextStreamHandler(for: "lk.transcription", onNewStream: handler)
        try await room.registerTextStreamHandler(for: "lk.chat", onNewStream: handler)
        try await room.registerRpcMethod("search_contacts") { data in
            await contacts.rpcResponse(payload: data.payload)
        }
        do {
            try await room.connect(url: url, token: token)
        } catch {
            if Task.isCancelled { throw CancellationError() }
            throw error
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
        await room.disconnect()
        self.room = nil
        bridge = nil
        onEvent?(.disconnected)
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
