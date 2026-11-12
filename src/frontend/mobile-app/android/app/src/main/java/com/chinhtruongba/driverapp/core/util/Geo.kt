package com.chinhtruongba.driverapp.core.util

import com.chinhtruongba.driverapp.core.model.LatLng
import com.chinhtruongba.driverapp.core.model.RouteStep
import kotlin.math.asin
import kotlin.math.cos
import kotlin.math.hypot
import kotlin.math.max
import kotlin.math.min
import kotlin.math.roundToInt
import kotlin.math.sin
import kotlin.math.sqrt

private const val EARTH_RADIUS_M = 6_371_000.0
private fun Double.rad() = Math.toRadians(this)

object Geo {
    fun distanceMeters(a: LatLng, b: LatLng): Double {
        val dLat = (b.lat - a.lat).rad()
        val dLng = (b.lng - a.lng).rad()
        val h = sin(dLat / 2).let { it * it } + cos(a.lat.rad()) * cos(b.lat.rad()) * sin(dLng / 2).let { it * it }
        return 2 * EARTH_RADIUS_M * asin(min(1.0, sqrt(h)))
    }

    /** Shortest distance from [point] to a polyline; +∞ for an empty path. */
    fun distanceToPathMeters(point: LatLng, path: List<LatLng>): Double {
        if (path.isEmpty()) return Double.POSITIVE_INFINITY
        if (path.size == 1) return distanceMeters(point, path[0])
        val cosLat = cos(point.lat.rad())
        fun project(p: LatLng) = Pair((p.lng - point.lng).rad() * cosLat * EARTH_RADIUS_M, (p.lat - point.lat).rad() * EARTH_RADIUS_M)
        var best = Double.POSITIVE_INFINITY
        var prev = project(path[0])
        for (i in 1 until path.size) {
            val cur = project(path[i])
            val dx = cur.first - prev.first
            val dy = cur.second - prev.second
            val lenSq = dx * dx + dy * dy
            val t = if (lenSq == 0.0) 0.0 else max(0.0, min(1.0, -(prev.first * dx + prev.second * dy) / lenSq))
            val d = hypot(prev.first + t * dx, prev.second + t * dy)
            if (d < best) best = d
            prev = cur
        }
        return best
    }
}

/** Google/Goong encoded polyline decoder (precision 5). */
object Polyline {
    fun decode(encoded: String, precision: Int = 5): List<LatLng> {
        val factor = Math.pow(10.0, precision.toDouble())
        val out = ArrayList<LatLng>()
        var index = 0
        var lat = 0
        var lng = 0
        while (index < encoded.length) {
            var shift = 0
            var result = 0
            var b: Int
            do {
                b = encoded[index++].code - 63
                result = result or ((b and 0x1f) shl shift)
                shift += 5
            } while (b >= 0x20 && index < encoded.length)
            lat += if (result and 1 != 0) (result shr 1).inv() else result shr 1
            shift = 0
            result = 0
            do {
                if (index >= encoded.length) break
                b = encoded[index++].code - 63
                result = result or ((b and 0x1f) shl shift)
                shift += 5
            } while (b >= 0x20)
            lng += if (result and 1 != 0) (result shr 1).inv() else result shr 1
            out += LatLng(lat / factor, lng / factor)
        }
        return out
    }
}

/** Pure turn-by-turn math (driver-app/src/features/home/lib/navigationMath.ts). */
object NavigationMath {
    const val ARRIVAL_THRESHOLD_M = 35.0
    const val OFF_ROUTE_THRESHOLD_M = 50.0
    const val OFF_ROUTE_TICKS = 3
    const val REROUTE_MIN_INTERVAL_MS = 20_000L

    /** Position of [point] along start→end: 0 at start, 1 at end, >1 past the end. */
    fun alongSegment(point: LatLng, start: LatLng, end: LatLng): Double {
        val cosLat = cos(start.lat.rad())
        val ex = (end.lng - start.lng).rad() * cosLat
        val ey = (end.lat - start.lat).rad()
        val px = (point.lng - start.lng).rad() * cosLat
        val py = (point.lat - start.lat).rad()
        val lenSq = ex * ex + ey * ey
        if (lenSq == 0.0) return 0.0
        return (px * ex + py * ey) / lenSq
    }

    /** Advances past every step whose end the driver reached (≤ 35 m) or projected past. */
    fun advanceStepIndex(origin: LatLng, steps: List<RouteStep>, fromIndex: Int): Int {
        var idx = fromIndex
        while (idx < steps.size) {
            val step = steps[idx]
            if (Geo.distanceMeters(origin, step.endLocation) <= ARRIVAL_THRESHOLD_M) { idx++; continue }
            if (alongSegment(origin, step.startLocation, step.endLocation) > 1) { idx++; continue }
            break
        }
        return idx
    }

    data class Remaining(val km: Double, val min: Int)

    fun remainingFromPosition(origin: LatLng?, steps: List<RouteStep>, stepIndex: Int): Remaining? {
        if (steps.isEmpty()) return null
        val current = steps.getOrNull(stepIndex) ?: return Remaining(0.0, 0)
        val rest = steps.drop(stepIndex + 1)
        val restM = rest.sumOf { it.distanceM }
        val restS = rest.sumOf { it.durationS }
        val aheadM = if (origin != null) min(current.distanceM, Geo.distanceMeters(origin, current.endLocation)) else current.distanceM
        val fraction = if (current.distanceM > 0) aheadM / current.distanceM else 1.0
        val aheadS = current.durationS * fraction
        return Remaining(
            km = Math.round(((restM + aheadM) / 1000.0) * 10.0) / 10.0,
            min = ((restS + aheadS) / 60.0).roundToInt(),
        )
    }

    data class OffRoute(val ticks: Int, val offRoute: Boolean, val shouldReroute: Boolean)

    fun offRouteTick(origin: LatLng, routePath: List<LatLng>, ticksSoFar: Int, lastRerouteAt: Long, now: Long): OffRoute {
        if (routePath.size < 2) return OffRoute(0, false, false)
        val away = Geo.distanceToPathMeters(origin, routePath)
        if (away <= OFF_ROUTE_THRESHOLD_M) return OffRoute(0, false, false)
        val ticks = ticksSoFar + 1
        if (ticks < OFF_ROUTE_TICKS) return OffRoute(ticks, false, false)
        val throttled = now - lastRerouteAt < REROUTE_MIN_INTERVAL_MS
        return OffRoute(ticks, true, !throttled)
    }
}

/** Live location push cadence (driver-app/src/features/home/lib/pushCadence.ts). */
object PushCadence {
    const val IDLE_INTERVAL_MS = 10 * 60 * 1000L
    const val EN_ROUTE_INTERVAL_MS = 60 * 1000L
    const val EN_ROUTE_MOVE_M = 500.0
    const val NEAR_STOP_M = 3000.0
    const val NEAR_INTERVAL_MS = 15 * 1000L
    const val NEAR_MOVE_M = 150.0

    data class Policy(val intervalMs: Long, val moveM: Double?)

    fun nearestStopMeters(here: LatLng, stops: List<LatLng>): Double? = stops.minOfOrNull { Geo.distanceMeters(here, it) }

    fun policy(here: LatLng, stops: List<LatLng>): Policy {
        val d = nearestStopMeters(here, stops) ?: return Policy(IDLE_INTERVAL_MS, null)
        return if (d <= NEAR_STOP_M) Policy(NEAR_INTERVAL_MS, NEAR_MOVE_M) else Policy(EN_ROUTE_INTERVAL_MS, EN_ROUTE_MOVE_M)
    }

    fun shouldPush(now: Long, lastPushAt: Long, here: LatLng, lastPushed: LatLng?, stops: List<LatLng>): Boolean {
        if (lastPushAt == 0L || lastPushed == null) return true
        val p = policy(here, stops)
        if (now - lastPushAt >= p.intervalMs) return true
        if (p.moveM != null && Geo.distanceMeters(lastPushed, here) >= p.moveM) return true
        return false
    }

    /** Background task throttle: at most one push per 20 s unless the driver moved 150 m. */
    const val BG_MIN_INTERVAL_MS = 20_000L
    const val BG_MIN_MOVE_M = 150.0

    fun shouldPushBackground(now: Long, lastPushAt: Long, here: LatLng, lastPushed: LatLng?): Boolean {
        if (lastPushAt == 0L || lastPushed == null) return true
        if (now - lastPushAt >= BG_MIN_INTERVAL_MS) return true
        return Geo.distanceMeters(lastPushed, here) >= BG_MIN_MOVE_M
    }
}

/** Live leg rescaling (driver-app/src/features/home/lib/liveLeg.ts). */
object LiveLeg {
    const val MIN_DETOUR = 1.0
    const val MAX_DETOUR = 2.0

    data class Leg(val distanceKm: Double?, val etaMinutes: Double?)

    fun compute(serverDistanceM: Double?, serverEtaMin: Double?, routeOrigin: LatLng?, live: LatLng?, stop: LatLng): Leg {
        val fallback = Leg(
            distanceKm = if (serverDistanceM != null && serverDistanceM > 0) serverDistanceM / 1000 else null,
            etaMinutes = if (serverEtaMin != null && serverEtaMin > 0) serverEtaMin else null,
        )
        if (live == null) return fallback
        val straightNow = Geo.distanceMeters(live, stop)
        var detour = 1.3
        if (serverDistanceM != null && serverDistanceM > 0 && routeOrigin != null) {
            val straightThen = Geo.distanceMeters(routeOrigin, stop)
            if (straightThen > 50) detour = serverDistanceM / straightThen
        }
        detour = min(MAX_DETOUR, max(MIN_DETOUR, detour))
        val remainingM = straightNow * detour
        var eta = fallback.etaMinutes
        if (eta != null && serverDistanceM != null && serverDistanceM > 0) {
            eta = max(1.0, Math.round(eta * min(1.5, remainingM / serverDistanceM)).toDouble())
        }
        return Leg(remainingM / 1000, eta)
    }
}
