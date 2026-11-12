import Foundation

/// Pure turn-by-turn math, ported from `features/home/lib/navigationMath.ts`.
enum NavigationMath {
    static let arrivalThresholdM = 35.0
    static let offRouteThresholdM = 50.0
    static let offRouteTicks = 3
    static let rerouteMinInterval: TimeInterval = 20

    /// 0 at start, 1 at end, >1 past the end, <0 before the start.
    static func alongSegment(_ point: LatLng, start: LatLng, end: LatLng) -> Double {
        let toRad = { (d: Double) in d * .pi / 180 }
        let cosLat = cos(toRad(start.lat))
        let ex = toRad(end.lng - start.lng) * cosLat, ey = toRad(end.lat - start.lat)
        let px = toRad(point.lng - start.lng) * cosLat, py = toRad(point.lat - start.lat)
        let lenSq = ex * ex + ey * ey
        if lenSq == 0 { return 0 }
        return (px * ex + py * ey) / lenSq
    }

    /// Advances past every step whose end the driver has reached or overshot.
    static func advanceStepIndex(origin: LatLng, steps: [RouteStep], from index: Int) -> Int {
        var idx = index
        while idx < steps.count {
            let step = steps[idx]
            if Geo.distanceMeters(origin, step.endLocation) <= arrivalThresholdM { idx += 1; continue }
            if alongSegment(origin, start: step.startLocation, end: step.endLocation) > 1 { idx += 1; continue }
            break
        }
        return idx
    }

    /// Remaining km / minutes from the driver's actual position.
    static func remaining(origin: LatLng?, steps: [RouteStep], stepIndex: Int) -> (km: Double, min: Double)? {
        if steps.isEmpty { return nil }
        guard stepIndex < steps.count else { return (0, 0) }
        let current = steps[stepIndex]
        let rest = steps.dropFirst(stepIndex + 1)
        let restM = rest.reduce(0) { $0 + $1.distanceM }
        let restS = rest.reduce(0) { $0 + $1.durationS }
        let aheadM = origin.map { min(current.distanceM, Geo.distanceMeters($0, current.endLocation)) } ?? current.distanceM
        let fraction = current.distanceM > 0 ? aheadM / current.distanceM : 1
        let aheadS = current.durationS * fraction
        return (((restM + aheadM) / 1000 * 10).rounded() / 10, ((restS + aheadS) / 60).rounded())
    }

    struct OffRouteResult: Equatable { var ticks: Int; var offRoute: Bool; var shouldReroute: Bool }

    /// Off-route state machine for one GPS tick (50 m × 3 ticks, ≤ 1 re-route per 20 s).
    static func offRouteTick(origin: LatLng, path: [LatLng], ticksSoFar: Int, lastRerouteAt: TimeInterval, now: TimeInterval) -> OffRouteResult {
        guard path.count >= 2 else { return .init(ticks: 0, offRoute: false, shouldReroute: false) }
        let away = Geo.distanceToPath(origin, path)
        if away <= offRouteThresholdM { return .init(ticks: 0, offRoute: false, shouldReroute: false) }
        let ticks = ticksSoFar + 1
        if ticks < offRouteTicks { return .init(ticks: ticks, offRoute: false, shouldReroute: false) }
        let throttled = now - lastRerouteAt < rerouteMinInterval
        return .init(ticks: ticks, offRoute: true, shouldReroute: !throttled)
    }

    /// Vietnamese action word for a Goong maneuver.
    static func actionWord(_ maneuver: String) -> String {
        let m = maneuver.lowercased()
        if m.contains("uturn") || m.contains("u-turn") { return "Quay đầu" }
        if m.contains("roundabout") || m.contains("rotary") { return "Vào vòng xuyến" }
        if m.contains("merge") || m.contains("ramp") || m.contains("fork") { return "Nhập làn" }
        if m.contains("left") { return "Rẽ trái" }
        if m.contains("right") { return "Rẽ phải" }
        if m.contains("straight") { return "Đi thẳng" }
        return "Tiếp tục"
    }

    /// "Rẽ trái trong 200 m" / "Đi thẳng 200 m".
    static func instruction(maneuver: String, distanceM: Double) -> String {
        let word = actionWord(maneuver)
        let dist = Fmt.meters(distanceM)
        if word == "Đi thẳng" || word == "Tiếp tục" { return "\(word) \(dist)" }
        return "\(word) trong \(dist)"
    }
}

/// Live distance / ETA to the next stop, rescaled from the GPS fix (`lib/liveLeg.ts`).
enum LiveLeg {
    static func compute(serverDistanceM: Double?, serverEtaMin: Double?, routeOrigin: LatLng?, live: LatLng?, stop: LatLng) -> (distanceKm: Double?, etaMinutes: Double?) {
        let fallbackKm = (serverDistanceM ?? 0) > 0 ? serverDistanceM! / 1000 : nil
        let fallbackEta = (serverEtaMin ?? 0) > 0 ? serverEtaMin : nil
        guard let live else { return (fallbackKm, fallbackEta) }
        let straightNow = Geo.distanceMeters(live, stop)
        var detour = 1.3
        if let server = serverDistanceM, server > 0, let origin = routeOrigin {
            let straightThen = Geo.distanceMeters(origin, stop)
            if straightThen > 50 { detour = server / straightThen }
        }
        detour = min(2, max(1, detour))
        let remainingM = straightNow * detour
        var eta = fallbackEta
        if let e = eta, let server = serverDistanceM, server > 0 {
            eta = max(1, (e * min(1.5, remainingM / server)).rounded())
        }
        return (remainingM / 1000, eta)
    }
}

/// When to send the live GPS fix (`lib/pushCadence.ts`).
enum PushCadence {
    static let idleInterval: TimeInterval = 10 * 60
    static let enRouteInterval: TimeInterval = 60
    static let enRouteMoveM = 500.0
    static let nearStopM = 3000.0
    static let nearInterval: TimeInterval = 15
    static let nearMoveM = 150.0

    struct Policy: Equatable { var interval: TimeInterval; var moveM: Double? }

    static func nearestStopMeters(_ here: LatLng, _ stops: [LatLng]) -> Double? {
        stops.map { Geo.distanceMeters(here, $0) }.min()
    }

    static func policy(here: LatLng, stops: [LatLng]) -> Policy {
        guard let d = nearestStopMeters(here, stops) else { return .init(interval: idleInterval, moveM: nil) }
        if d <= nearStopM { return .init(interval: nearInterval, moveM: nearMoveM) }
        return .init(interval: enRouteInterval, moveM: enRouteMoveM)
    }

    static func shouldPush(now: TimeInterval, lastPushAt: TimeInterval, here: LatLng, lastPushed: LatLng?, stops: [LatLng]) -> Bool {
        guard lastPushAt != 0, let lastPushed else { return true }
        let p = policy(here: here, stops: stops)
        if now - lastPushAt >= p.interval { return true }
        if let move = p.moveM, Geo.distanceMeters(lastPushed, here) >= move { return true }
        return false
    }

    /// Background throttle: at most one push per 20 s unless moved 150 m.
    static func shouldPushBackground(now: TimeInterval, lastPushAt: TimeInterval, here: LatLng, lastPushed: LatLng?) -> Bool {
        guard lastPushAt != 0, let lastPushed else { return true }
        if now - lastPushAt >= 20 { return true }
        return Geo.distanceMeters(lastPushed, here) >= 150
    }
}
