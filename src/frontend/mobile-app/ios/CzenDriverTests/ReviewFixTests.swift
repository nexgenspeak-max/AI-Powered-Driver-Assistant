import Foundation
import Testing
@testable import CzenDriver

// Review findings whose fix introduced new seams: transcript finality, socket open/keepalive,
// map label repair, sign-out location stop, per-configuration ATS.

@Suite("Transcription finality")
struct TranscriptionFinalityTests {
    private func run(topic: String, attributes: [String: String], chunks: [String]) async throws -> [(String, Bool)] {
        let stream = AsyncStream<String> { c in
            chunks.forEach { c.yield($0) }
            c.finish()
        }
        var updates: [(String, Bool)] = []
        try await TextStreamTranscript.consume(stream, topic: topic, attributes: attributes) { updates.append(($0, $1)) }
        return updates
    }

    @Test("lk.transcription_final == \"false\" keeps the whole stream interim")
    func interimStream() async throws {
        let u = try await run(topic: "lk.transcription", attributes: ["lk.transcription_final": "false", "lk.segment_id": "s1"], chunks: ["Chào", " anh"])
        #expect(u.map(\.0) == ["Chào", "Chào anh"])
        #expect(u.allSatisfy { !$0.1 })
    }

    @Test("a final stream streams interim chunks and ends with one final update",
          arguments: [["lk.transcription_final": "true"], [:]])
    func finalStream(attributes: [String: String]) async throws {
        let u = try await run(topic: "lk.transcription", attributes: attributes, chunks: ["Chào", " anh"])
        #expect(u.map(\.1) == [false, false, true])
        #expect(u.last?.0 == "Chào anh")
    }

    @Test("lk.chat messages are final")
    func chat() async throws {
        let u = try await run(topic: "lk.chat", attributes: [:], chunks: ["Xin ", "chào"])
        #expect(u.count == 1)
        #expect(u[0].0 == "Xin chào")
        #expect(u[0].1)
    }

    @MainActor
    @Test("interim customer text never reaches call_transcript; the final does once")
    func bridgeTranscript() async throws {
        let engine = FakeVoiceEngine()
        let session = VoiceSession(engine: engine, api: DemoBackend(latency: .zero), prefs: Preferences(defaults: UserDefaults(suiteName: "test-\(UUID())")!),
                                   audio: FillerAudio(enabled: false), settleDelay: .zero, asksMicPermission: false)
        await session.connect(phone: "0901234567")
        engine.onEvent?(.data(topic: "call_state", payload: Data(#"{"type":"call_state","active":true,"mode":"bridge"}"#.utf8)))
        session.emit(text: "Alo", identity: "customer-1", isLocal: false, isFinal: false, segmentId: "c1")
        session.emit(text: "Alo anh", identity: "customer-1", isLocal: false, isFinal: false, segmentId: "c1")
        session.emit(text: "Alo anh ơi", identity: "customer-1", isLocal: false, isFinal: true, segmentId: "c1")
        await waitUntil { !engine.published.isEmpty }
        try await Task.sleep(for: .milliseconds(30))
        #expect(engine.published.count == 1)
        #expect(engine.published.first?.1 == ["speaker": "customer", "text": "Alo anh ơi"])
    }
}

// MARK: Dispatch socket

private final class FakeConnection: WebSocketConnection, @unchecked Sendable {
    // Safe: every access goes through `lock`.
    private let lock = NSLock()
    private let stream: AsyncThrowingStream<URLSessionWebSocketTask.Message, Error>
    private let continuation: AsyncThrowingStream<URLSessionWebSocketTask.Message, Error>.Continuation
    private var _pingFails = false
    private var _pings = 0
    private var _closed = false

    init() { (stream, continuation) = AsyncThrowingStream.makeStream() }

    var pingFails: Bool { get { lock.withLock { _pingFails } } set { lock.withLock { _pingFails = newValue } } }
    var pings: Int { lock.withLock { _pings } }
    var closed: Bool { lock.withLock { _closed } }

    func push(_ text: String) { continuation.yield(.string(text)) }

    func receive() async throws -> URLSessionWebSocketTask.Message {
        var it = stream.makeAsyncIterator()
        guard let m = try await it.next() else { throw URLError(.networkConnectionLost) }
        return m
    }

    func sendPing() async throws {
        let fail = lock.withLock { _pings += 1; return _pingFails }
        if fail { throw URLError(.networkConnectionLost) }
    }

    func close() {
        lock.withLock { _closed = true }
        continuation.finish(throwing: URLError(.cancelled))
    }
}

@MainActor
@Suite("Dispatch socket")
struct DispatchSocketTests {
    @Test(".opened fires on the handshake, before any frame")
    func openedOnHandshake() async {
        var connections: [FakeConnection] = []
        var events: [DispatchEvent] = []
        let socket = LiveDispatchSocket(baseURL: URL(string: "ws://test/ws")!, keepAlive: .seconds(60), reconnectDelay: .seconds(60)) { _, onOpen in
            let c = FakeConnection()
            connections.append(c)
            onOpen()
            return c
        }
        socket.onEvent = { events.append($0) }
        socket.start(phone: "0901234567")
        await waitUntil { !events.isEmpty }
        #expect(events == [.opened])
        connections.first?.push(#"{"event":"trip_confirmed","data":{}}"#)
        await waitUntil { events.count == 2 }
        #expect(events == [.opened, .tripConfirmed])
        socket.stop()
        #expect(connections.first?.closed == true)
    }

    @Test("a failed keepalive ping closes the socket and it reconnects")
    func pingFailureReconnects() async {
        var connections: [FakeConnection] = []
        let socket = LiveDispatchSocket(baseURL: URL(string: "ws://test/ws")!, keepAlive: .milliseconds(30), reconnectDelay: .milliseconds(30)) { _, onOpen in
            let c = FakeConnection()
            c.pingFails = connections.isEmpty // only the first connection is dead
            connections.append(c)
            onOpen()
            return c
        }
        socket.start(phone: "0901234567")
        await waitUntil { connections.count >= 2 }
        #expect(connections.count >= 2)
        #expect(connections[0].closed)
        await waitUntil { connections[1].pings >= 2 }
        #expect(connections[1].pings >= 2) // healthy connection keeps pinging
        #expect(connections.count == 2)
        socket.stop()
    }

    @Test("no events after stop()")
    func noEventsAfterStop() async {
        var opens: [@Sendable () -> Void] = []
        var events: [DispatchEvent] = []
        let socket = LiveDispatchSocket(baseURL: URL(string: "ws://test/ws")!, keepAlive: .seconds(60), reconnectDelay: .seconds(60)) { _, onOpen in
            opens.append(onOpen)
            return FakeConnection()
        }
        socket.onEvent = { events.append($0) }
        socket.start(phone: "0901234567")
        await waitUntil { !opens.isEmpty }
        socket.stop()
        opens.first?() // a late handshake callback
        try? await Task.sleep(for: .milliseconds(30))
        #expect(events.isEmpty)
    }
}

// MARK: Map labels

@Suite("Map label repair")
struct MapLabelRepairTests {
    @Test("double-encoded Goong POI names are restored", arguments: [
        ("Cã´ng Ty Cá»• Pháº§n Hã³a Dæ°á»£c Vã\u{a0} Cã´ng Nghá»‡ Sinh Há»\u{8d}c Biogreen", "Công Ty Cổ Phần Hóa Dược Và Công Nghệ Sinh Học Biogreen"),
        ("Bãºn Cháº£", "Bún Chả"),
        ("Cã´ng Ty Phã¡t Triá»ƒn Thá»§y Sáº£n Nam Ä\u{90}áº¡i Dæ°æ¡ng", "Công Ty Phát Triển Thủy Sản Nam Đại Dương"),
        ("Floriel - Tiá»†m Hoa Tæ¯æ\u{a0}I", "Floriel - Tiệm Hoa Tươi"),
        ("Cã´ng Ty Tnhh Sáº£n Xuáº¥t Cæ¡ Khã\u{ad} Vã\u{a0} Thæ°æ¡ng Máº¡i Dá»‹ch Vá»¥ Ä\u{90}äƒng Phæ°æ¡ng",
         "Công Ty Tnhh Sản Xuất Cơ Khí Và Thương Mại Dịch Vụ Đăng Phương"),
    ])
    func repairs(garbled: String, expected: String) {
        #expect(MojibakeRepair.repair(garbled) == expected)
    }

    @Test("correct names are left alone", arguments: [
        "Bãi Gửi Xe Viện Phổi", "Ga Kim Mã", "Bhome Kim Mã", "Hồ Hoàn Kiếm", "Nhung Coffee", "Café Ân", "Trà", "211 Kim Mã", "Ngõ 189 Hoàng Hoa Thám", "",
    ])
    func untouched(name: String) {
        #expect(MojibakeRepair.repair(name) == nil)
    }

    // Minimal MVT writer for the test fixture.
    private func varint(_ v: Int) -> [UInt8] {
        var v = UInt64(v), out: [UInt8] = []
        while v >= 0x80 { out.append(UInt8(v & 0x7F) | 0x80); v >>= 7 }
        return out + [UInt8(v)]
    }
    private func field(_ n: Int, _ payload: [UInt8]) -> [UInt8] { varint(n << 3 | 2) + varint(payload.count) + payload }
    private func value(_ s: String) -> [UInt8] { field(4, field(1, Array(s.utf8))) }
    private func layer(_ name: String, values: [String]) -> [UInt8] {
        let feature = field(2, [0x10, 0x00]) // feature with a dummy varint field
        let body = varint(15 << 3) + [2] + field(1, Array(name.utf8)) + feature + field(3, Array("name".utf8)) + values.flatMap(value) + varint(5 << 3) + varint(4096)
        return field(3, body)
    }

    private func strings(in tile: [UInt8]) -> [String] {
        // Decode with the same wire format: layers → values → string.
        var found: [String] = []
        func walk(_ b: ArraySlice<UInt8>, depth: Int) {
            var i = b.startIndex
            while i < b.endIndex {
                var key = 0, shift = 0
                while true { let c = b[i]; i += 1; key |= Int(c & 0x7F) << shift; shift += 7; if c < 0x80 { break } }
                switch key & 7 {
                case 0: while b[i] >= 0x80 { i += 1 }; i += 1
                case 2:
                    var len = 0; shift = 0
                    while true { let c = b[i]; i += 1; len |= Int(c & 0x7F) << shift; shift += 7; if c < 0x80 { break } }
                    let payload = b[i..<(i + len)]
                    i += len
                    let f = key >> 3
                    if depth == 0 && f == 3 { walk(payload, depth: 1) } else if depth == 1 && f == 4 { walk(payload, depth: 2) } else if depth == 2 && f == 1 {
                        found.append(String(decoding: payload, as: UTF8.self))
                    }
                default: return
                }
            }
        }
        walk(tile[...], depth: 0)
        return found
    }

    @Test("tile values are rewritten; other bytes survive; clean tiles are untouched")
    func tileRewrite() throws {
        let tile = layer("point_map", values: ["Bãºn Cháº£", "Hồ Tây"]) + layer("streets", values: ["Kim Mã"])
        let fixed = try #require(VectorTileRepair.repair(Data(tile)))
        #expect(strings(in: [UInt8](fixed)) == ["Bún Chả", "Hồ Tây", "Kim Mã"])
        #expect(VectorTileRepair.repair(Data(layer("streets", values: ["Kim Mã", "Liễu Giai"]))) == nil)
        #expect(VectorTileRepair.repair(Data([0x1F, 0x8B, 0x08])) == nil)
        #expect(VectorTileRepair.repair(Data([0x1A, 0xFF])) == nil) // truncated
    }

    @Test("only Goong tile URLs are repaired")
    func urlFilter() {
        #expect(GoongTileRepairer.shouldRepair(URL(string: "https://tiles.goong.io/tiles/composite/16/52031/28849.pbf?api_key=x")))
        #expect(!GoongTileRepairer.shouldRepair(URL(string: "https://tiles.goong.io/assets/goong_map_web.json")))
        #expect(!GoongTileRepairer.shouldRepair(URL(string: "https://example.com/tiles/1/2/3.pbf")))
    }
}

// MARK: Sign-out location, ATS

@MainActor
@Suite("Sign-out location and ATS")
struct SignOutLocationTests {
    @Test("logout stops the foreground location watch")
    func logoutStopsForegroundLocation() async {
        let model = SignOutTests().makeModel()
        await model.bootstrap()
        #expect(model.location.foregroundActive)
        await model.logout()
        #expect(model.location.foregroundActive == false)
    }

    @Test("ATS allows plain http only in Debug builds")
    func transportSecurity() {
        let ats = Bundle.main.object(forInfoDictionaryKey: "NSAppTransportSecurity") as? [String: Any]
        #if DEBUG
        #expect(ats?["NSAllowsArbitraryLoads"] as? Bool == true)
        #else
        #expect(ats == nil)
        #endif
    }
}
