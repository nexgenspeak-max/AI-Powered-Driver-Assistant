import Foundation
import Testing
@testable import CzenDriver

@Suite("Transcript merge and dedupe")
struct TranscriptTests {
    @Test("interim chunks with one segment id stay in one bubble")
    func segmentMerge() {
        var chats: [ChatMessage] = []
        chats = TranscriptMerge.upsert(chats, who: .bot, msg: "Chào", isFinal: false, segmentId: "s1")
        chats = TranscriptMerge.upsert(chats, who: .bot, msg: "Chào anh", isFinal: false, segmentId: "s1")
        chats = TranscriptMerge.upsert(chats, who: .bot, msg: "Chào anh Minh.", isFinal: true, segmentId: "s1")
        #expect(chats.count == 1)
        #expect(chats[0].msg == "Chào anh Minh.")
        #expect(chats[0].streaming == false)
    }

    @Test("a duplicate stream with a new segment id merges into the equivalent bubble")
    func duplicateStream() {
        var chats = TranscriptMerge.upsert([], who: .me, msg: "Điểm tiếp theo là đâu?", isFinal: true, segmentId: "a")
        chats = TranscriptMerge.upsert(chats, who: .me, msg: "điểm tiếp theo là đâu", isFinal: true, segmentId: "b")
        #expect(chats.count == 1)
    }

    @Test("different speakers never merge")
    func speakersSeparate() {
        var chats = TranscriptMerge.upsert([], who: .me, msg: "Xin chào", isFinal: true, segmentId: nil)
        chats = TranscriptMerge.upsert(chats, who: .bot, msg: "Xin chào", isFinal: true, segmentId: nil)
        chats = TranscriptMerge.upsert(chats, who: .me, msg: "Lịch hôm nay", isFinal: true, segmentId: nil)
        #expect(chats.map(\.who) == [.me, .bot, .me])
    }

    @Test("a final repeat within 3 s is dropped, after 3 s it is admitted")
    func dedupeWindow() {
        var d = TranscriptDeduper()
        let first = d.admit(from: "bot", text: "Dạ vâng.", now: 100)
        let repeatWithin = d.admit(from: "bot", text: "dạ  vâng", now: 102)
        let repeatAfter = d.admit(from: "bot", text: "Dạ vâng", now: 103.5)
        let otherSpeaker = d.admit(from: "me", text: "Dạ vâng", now: 103.6)
        #expect(first)
        #expect(!repeatWithin)
        #expect(repeatAfter)
        #expect(otherSpeaker)
    }

    @Test("raw tool ids are hidden", arguments: [("search_contacts", true), ("get_trip_2", true), ("hello", false), ("Gọi khách", false), ("call now_x", false)])
    func rawToolTokens(text: String, hidden: Bool) {
        #expect(TranscriptDeduper.isRawToolToken(text) == hidden)
    }
}

@Suite("Navigation math")
struct NavigationMathTests {
    let a = LatLng(lat: 21.0300, lng: 105.8300)
    let b = LatLng(lat: 21.0300, lng: 105.8400)
    let c = LatLng(lat: 21.0400, lng: 105.8400)

    func step(_ s: LatLng, _ e: LatLng, _ m: Double = 1000, _ sec: Double = 120) -> RouteStep {
        RouteStep(instruction: "", maneuver: "turn-left", distanceM: m, durationS: sec, startLocation: s, endLocation: e)
    }

    @Test("alongSegment is 0 at start, 1 at end, >1 past the end")
    func along() {
        #expect(abs(NavigationMath.alongSegment(a, start: a, end: b)) < 1e-9)
        #expect(abs(NavigationMath.alongSegment(b, start: a, end: b) - 1) < 1e-9)
        #expect(NavigationMath.alongSegment(LatLng(lat: 21.03, lng: 105.845), start: a, end: b) > 1)
    }

    @Test("advances within 35 m of a step end or when overshooting it")
    func advance() {
        let steps = [step(a, b), step(b, c)]
        #expect(NavigationMath.advanceStepIndex(origin: a, steps: steps, from: 0) == 0)
        let nearB = LatLng(lat: 21.0301, lng: 105.8399) // ~15 m
        #expect(NavigationMath.advanceStepIndex(origin: nearB, steps: steps, from: 0) == 1)
        let pastB = LatLng(lat: 21.0300, lng: 105.8410) // overshot along a→b, short of c
        #expect(NavigationMath.advanceStepIndex(origin: pastB, steps: steps, from: 0) >= 1)
    }

    @Test("remaining counts the rest of the current step plus later steps")
    func remaining() throws {
        let steps = [step(a, b, 1000, 120), step(b, c, 1100, 180)]
        let r = try #require(NavigationMath.remaining(origin: a, steps: steps, stepIndex: 0))
        #expect(r.km == 2.1)
        #expect(r.min == 5)
        #expect(NavigationMath.remaining(origin: a, steps: [], stepIndex: 0) == nil)
    }

    @Test("off-route needs 50 m × 3 ticks and re-routes at most once per 20 s")
    func offRoute() {
        let path = [a, b]
        let off = LatLng(lat: 21.0310, lng: 105.8350) // ~110 m north of the line
        var r = NavigationMath.offRouteTick(origin: off, path: path, ticksSoFar: 0, lastRerouteAt: 0, now: 100)
        #expect(r.ticks == 1 && !r.shouldReroute)
        r = NavigationMath.offRouteTick(origin: off, path: path, ticksSoFar: r.ticks, lastRerouteAt: 0, now: 101)
        #expect(r.ticks == 2 && !r.shouldReroute)
        r = NavigationMath.offRouteTick(origin: off, path: path, ticksSoFar: r.ticks, lastRerouteAt: 0, now: 102)
        #expect(r.offRoute && r.shouldReroute)
        let throttled = NavigationMath.offRouteTick(origin: off, path: path, ticksSoFar: 3, lastRerouteAt: 95, now: 105)
        #expect(throttled.offRoute && !throttled.shouldReroute)
        let on = NavigationMath.offRouteTick(origin: LatLng(lat: 21.0300, lng: 105.8350), path: path, ticksSoFar: 2, lastRerouteAt: 0, now: 106)
        #expect(on.ticks == 0 && !on.offRoute)
    }

    @Test("Vietnamese instructions")
    func instructions() {
        #expect(NavigationMath.instruction(maneuver: "turn-left", distanceM: 200) == "Rẽ trái trong 200 m")
        #expect(NavigationMath.instruction(maneuver: "straight", distanceM: 200) == "Đi thẳng 200 m")
        #expect(NavigationMath.actionWord("uturn-right") == "Quay đầu")
        #expect(NavigationMath.actionWord("roundabout-left") == "Vào vòng xuyến")
    }

    @Test("polyline encode/decode round-trips")
    func polyline() {
        let pts = [LatLng(lat: 38.5, lng: -120.2), LatLng(lat: 40.7, lng: -120.95), LatLng(lat: 43.252, lng: -126.453)]
        #expect(Geo.encodePolyline(pts) == "_p~iF~ps|U_ulLnnqC_mqNvxq`@")
        let decoded = Geo.decodePolyline("_p~iF~ps|U_ulLnnqC_mqNvxq`@")
        #expect(decoded.count == 3)
        #expect(abs(decoded[2].lng - -126.453) < 1e-6)
    }

    @Test("live leg rescales the server distance by detour and clamps it")
    func liveLeg() {
        let stop = LatLng(lat: 21.04, lng: 105.83)
        let origin = LatLng(lat: 21.03, lng: 105.83) // ~1112 m straight
        let r = LiveLeg.compute(serverDistanceM: 1500, serverEtaMin: 6, routeOrigin: origin, live: origin, stop: stop)
        #expect(abs((r.distanceKm ?? 0) - 1.5) < 0.01)
        #expect(r.etaMinutes == 6)
        let noLive = LiveLeg.compute(serverDistanceM: 1500, serverEtaMin: 6, routeOrigin: origin, live: nil, stop: stop)
        #expect(noLive.distanceKm == 1.5)
    }
}

@Suite("Push cadence")
struct PushCadenceTests {
    let here = LatLng(lat: 21.03, lng: 105.83)

    @Test("first fix always pushes")
    func first() {
        #expect(PushCadence.shouldPush(now: 10, lastPushAt: 0, here: here, lastPushed: nil, stops: []))
    }

    @Test("policy by distance to the nearest stop")
    func policy() {
        #expect(PushCadence.policy(here: here, stops: []) == .init(interval: 600, moveM: nil))
        #expect(PushCadence.policy(here: here, stops: [LatLng(lat: 21.04, lng: 105.83)]) == .init(interval: 15, moveM: 150))
        #expect(PushCadence.policy(here: here, stops: [LatLng(lat: 21.10, lng: 105.83)]) == .init(interval: 60, moveM: 500))
    }

    @Test("near a stop: due after 15 s or 150 m")
    func nearStop() {
        let stops = [LatLng(lat: 21.04, lng: 105.83)]
        #expect(!PushCadence.shouldPush(now: 1010, lastPushAt: 1000, here: here, lastPushed: here, stops: stops))
        #expect(PushCadence.shouldPush(now: 1015, lastPushAt: 1000, here: here, lastPushed: here, stops: stops))
        let moved = LatLng(lat: 21.0315, lng: 105.83) // ~167 m
        #expect(PushCadence.shouldPush(now: 1005, lastPushAt: 1000, here: moved, lastPushed: here, stops: stops))
    }

    @Test("idle: only every 10 minutes regardless of movement")
    func idle() {
        let moved = LatLng(lat: 21.05, lng: 105.83)
        #expect(!PushCadence.shouldPush(now: 1300, lastPushAt: 1000, here: moved, lastPushed: here, stops: []))
        #expect(PushCadence.shouldPush(now: 1600, lastPushAt: 1000, here: moved, lastPushed: here, stops: []))
    }

    @Test("background throttle: 20 s or 150 m")
    func background() {
        #expect(!PushCadence.shouldPushBackground(now: 1010, lastPushAt: 1000, here: here, lastPushed: here))
        #expect(PushCadence.shouldPushBackground(now: 1020, lastPushAt: 1000, here: here, lastPushed: here))
        #expect(PushCadence.shouldPushBackground(now: 1005, lastPushAt: 1000, here: LatLng(lat: 21.032, lng: 105.83), lastPushed: here))
    }
}

@Suite("Formatting")
struct FormattingTests {
    @Test("VND currency", arguments: [(120000.0, "120.000\u{00A0}₫"), (0, "0\u{00A0}₫"), (1_234_567, "1.234.567\u{00A0}₫"), (999, "999\u{00A0}₫")])
    func currency(amount: Double, expected: String) {
        #expect(Fmt.currency(amount) == expected)
    }

    @Test("distance", arguments: [(4.5, "4,5 km"), (0.04, "0,0 km"), (9.96, "10,0 km"), (12.4, "12 km"), (1674.2, "1.674 km")])
    func distance(km: Double, expected: String) {
        #expect(Fmt.km(km) == expected)
    }

    @Test("duration", arguments: [(12.0, "12 phút"), (60, "1 giờ"), (65, "1 giờ 05 phút"), (125.4, "2 giờ 05 phút"), (-3, "0 phút")])
    func duration(min: Double, expected: String) {
        #expect(Fmt.minutes(min) == expected)
    }

    @Test("route line and missing values")
    func route() {
        #expect(Fmt.route(eta: 12, km: 4.5) == "12 phút · 4,5 km")
        #expect(Fmt.route(eta: nil, km: 4.5) == "—")
        #expect(Fmt.km(nil) == "")
    }

    @Test("bare HH:mm pickup times pass through")
    func bareTime() {
        #expect(Fmt.time("14:30") == "14:30")
        #expect(Fmt.time("") == "—")
    }

    @Test("voice language resolves vi → vn")
    func voiceLang() {
        #expect(Preferences.resolveLang("vi") == .vn)
        #expect(Preferences.resolveLang("en") == .en)
        #expect(Preferences.resolveLang("fr") == .vn)
        #expect(Preferences.resolveLang(nil) == .vn)
    }
}

@Suite("Accent-insensitive search")
struct SearchTests {
    @Test("folds diacritics and đ")
    func fold() {
        #expect(ViSearch.fold("  Đặng   Mỹ Linh ") == "dang my linh")
        #expect(ViSearch.fold("Nguyễn Văn Đức") == "nguyen van duc")
    }

    @Test("every query word must match some field", arguments: [
        ("nguyen", true), ("dang my", true), ("linh 0901", true), ("tran", false), ("", true), ("ĐẶNG", true),
    ])
    func matches(query: String, expected: Bool) {
        #expect(ViSearch.matches(query, ["Đặng Mỹ Linh Nguyễn", "0901234567", nil]) == expected)
    }

    @Test("wake phrase tolerates decoys", arguments: [
        ("hey AI", true), ("Hey, A.I.", true), ("okay hey ai please", true), ("hey a i", true), ("hey I", true),
        ("hey I need a ride", false), ("hey", false), ("hi there", false), ("thank you", false), ("say hey", false),
    ])
    func wakePhrase(text: String, expected: Bool) {
        #expect(WakePhrase.matches(text) == expected)
    }
}

@MainActor
@Suite("Earnings and validation")
struct EarningsTests {
    func trip(_ id: String, _ iso: String, _ fare: Double) -> Trip {
        Trip(tripId: id, status: .completed, pickupAddress: "A", dropoffAddress: "B", updatedAt: iso, estimatedFare: fare)
    }

    @Test("groups by completion day with totals")
    func grouping() {
        let now = Fmt.parseISO("2026-11-12T12:00:00+07:00")!
        let trips = [trip("1", "2026-11-12T10:00:00+07:00", 100), trip("2", "2026-11-12T08:00:00+07:00", 50), trip("3", "2026-11-11T09:00:00+07:00", 70)]
        var cal = Calendar(identifier: .gregorian)
        cal.timeZone = TimeZone(identifier: "Asia/Ho_Chi_Minh")!
        let groups = EarningsMath.group(trips, now: now)
        #expect(groups.count == 2)
        #expect(groups[0].total == 150)
        #expect(EarningsMath.week(trips, now: now, calendar: cal).count == 7)
        #expect(EarningsMath.week(trips, now: now, calendar: cal).last?.total == 150)
    }

    @Test("register validation messages")
    func registerValidation() {
        let e = RegisterView.validate(name: "A", phone: "123", email: "x", password: "123", vehicleType: nil, plate: "1", vehicleName: "B")
        #expect(e["name"] == "Tên tối thiểu 2 ký tự")
        #expect(e["phone"] == "Số điện thoại chưa hợp lệ")
        #expect(e["email"] == "Email chưa hợp lệ")
        #expect(e["password"] == "Mật khẩu tối thiểu 6 ký tự")
        #expect(e["vehicle_type"] == "Chọn loại xe")
        #expect(e["plate"] == "Biển số chưa hợp lệ")
        #expect(e["vehicle_name"] == "Nhập tên xe")
        #expect(RegisterView.validate(name: "Minh", phone: "0901234567", email: "a@b.vn", password: "secret", vehicleType: .car4, plate: "30A-123", vehicleName: "Vios").isEmpty)
    }

    @Test("dispatch frames parse")
    func dispatchParse() {
        #expect(LiveDispatchSocket.parse(Data(#"{"event":"trip_offer","data":{"trip_id":"t1"}}"#.utf8)) == .tripOffer(tripId: "t1"))
        #expect(LiveDispatchSocket.parse(Data(#"{"event":"trip_confirmed","data":{}}"#.utf8)) == .tripConfirmed)
        #expect(LiveDispatchSocket.parse(Data(#"{"event":"pending_nudge","data":{"kind":"x"}}"#.utf8)) == .invalidate("pending_nudge"))
        #expect(LiveDispatchSocket.parse(Data("nope".utf8)) == nil)
    }

    @Test("settings patch applies optimistically")
    func settingsPatch() {
        let s = AccountSettings(handsFreeMode: false, notifyOnPickupApproach: false, notifyOnPickupApproachRadiusM: 1000, autoSuggestNextStop: false, autoSuggestNextStopRadiusM: 500, defaultCustomerCallMode: "agent")
        let next = AccountSettingsPatch(handsFreeMode: true, notifyOnPickupApproachRadiusM: 2000).applied(to: s)
        #expect(next.handsFreeMode && next.notifyOnPickupApproachRadiusM == 2000 && !next.notifyOnPickupApproach)
    }
}
