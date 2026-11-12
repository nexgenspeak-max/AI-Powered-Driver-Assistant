package com.chinhtruongba.driverapp.core

import com.chinhtruongba.driverapp.core.model.LatLng
import com.chinhtruongba.driverapp.core.model.RouteStep
import com.chinhtruongba.driverapp.core.util.Geo
import com.chinhtruongba.driverapp.core.util.LiveLeg
import com.chinhtruongba.driverapp.core.util.NavigationMath
import com.chinhtruongba.driverapp.core.util.Polyline
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class NavigationMathTest {
    private val a = LatLng(21.0285, 105.8522)
    private val b = LatLng(21.0247, 105.8530)
    private val c = LatLng(21.0236, 105.8460)
    private val steps = listOf(
        RouteStep(maneuver = "straight", distanceM = Geo.distanceMeters(a, b), durationS = 60.0, startLocation = a, endLocation = b),
        RouteStep(maneuver = "turn-right", distanceM = Geo.distanceMeters(b, c), durationS = 120.0, startLocation = b, endLocation = c),
    )

    @Test fun `haversine is about 430 m between two Ha Noi points`() {
        val d = Geo.distanceMeters(a, b)
        assertTrue("was $d", d in 400.0..460.0)
    }

    @Test fun `along segment is 0 at start, 1 at end, above 1 past it`() {
        assertEquals(0.0, NavigationMath.alongSegment(a, a, b), 1e-9)
        assertEquals(1.0, NavigationMath.alongSegment(b, a, b), 1e-9)
        val past = LatLng(b.lat + (b.lat - a.lat) * 0.5, b.lng + (b.lng - a.lng) * 0.5)
        assertTrue(NavigationMath.alongSegment(past, a, b) > 1)
        assertEquals(0.0, NavigationMath.alongSegment(a, a, a), 0.0)
    }

    @Test fun `step advances within 35 m of its end or when projected past it`() {
        assertEquals(0, NavigationMath.advanceStepIndex(a, steps, 0))
        val nearEnd = LatLng(b.lat + 0.0002, b.lng) // ~22 m
        assertEquals(1, NavigationMath.advanceStepIndex(nearEnd, steps, 0))
        assertEquals(0, NavigationMath.advanceStepIndex(c, steps, 0)) // not projected past step 0
        assertEquals(2, NavigationMath.advanceStepIndex(c, steps, 1))
    }

    @Test fun `remaining sums the rest plus what is ahead on the current step`() {
        val r = NavigationMath.remainingFromPosition(a, steps, 0)!!
        val total = steps.sumOf { it.distanceM } / 1000
        assertEquals(Math.round(total * 10) / 10.0, r.km, 0.05)
        assertEquals(3, r.min)
        assertNull(NavigationMath.remainingFromPosition(a, emptyList(), 0))
        assertEquals(NavigationMath.Remaining(0.0, 0), NavigationMath.remainingFromPosition(a, steps, 5))
    }

    @Test fun `off route needs 3 ticks beyond 50 m and reroutes at most every 20 s`() {
        val path = listOf(a, b)
        val far = LatLng(a.lat, a.lng + 0.002) // ~200 m east
        var t = NavigationMath.offRouteTick(far, path, 0, 0, 100_000)
        assertEquals(1, t.ticks); assertFalse(t.offRoute)
        t = NavigationMath.offRouteTick(far, path, t.ticks, 0, 100_000)
        assertFalse(t.shouldReroute)
        t = NavigationMath.offRouteTick(far, path, t.ticks, 0, 100_000)
        assertTrue(t.offRoute); assertTrue(t.shouldReroute)
        val throttled = NavigationMath.offRouteTick(far, path, t.ticks, 90_000, 100_000)
        assertTrue(throttled.offRoute); assertFalse(throttled.shouldReroute)
        val back = NavigationMath.offRouteTick(a, path, 5, 0, 100_000)
        assertEquals(0, back.ticks)
    }

    @Test fun `polyline decodes the Google reference string`() {
        val pts = Polyline.decode("_p~iF~ps|U_ulLnnqC_mqNvxq`@")
        assertEquals(3, pts.size)
        assertEquals(38.5, pts[0].lat, 1e-5); assertEquals(-120.2, pts[0].lng, 1e-5)
        assertEquals(40.7, pts[1].lat, 1e-5); assertEquals(-120.95, pts[1].lng, 1e-5)
        assertEquals(43.252, pts[2].lat, 1e-5); assertEquals(-126.453, pts[2].lng, 1e-5)
    }

    @Test fun `live leg rescales server distance by the detour ratio`() {
        val leg = LiveLeg.compute(serverDistanceM = 1000.0, serverEtaMin = 10.0, routeOrigin = a, live = a, stop = b)
        assertNotNull(leg.distanceKm)
        // detour = 1000 m / ~430 m straight → clamped to 2, so remaining ≈ 2 × straight line
        assertEquals(2 * Geo.distanceMeters(a, b) / 1000, leg.distanceKm!!, 1e-6)
        assertEquals(9.0, leg.etaMinutes!!, 0.01)
        val noFix = LiveLeg.compute(800.0, 6.0, a, null, b)
        assertEquals(0.8, noFix.distanceKm!!, 1e-9)
        val unknownOrigin = LiveLeg.compute(null, null, null, a, b)
        assertEquals(Geo.distanceMeters(a, b) * 1.3 / 1000, unknownOrigin.distanceKm!!, 1e-6)
    }
}
