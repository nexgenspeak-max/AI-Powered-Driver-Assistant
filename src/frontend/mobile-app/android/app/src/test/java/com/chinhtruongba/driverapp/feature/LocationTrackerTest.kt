package com.chinhtruongba.driverapp.feature

import com.chinhtruongba.driverapp.core.FakeTokenStore
import com.chinhtruongba.driverapp.core.data.DriverRepository
import com.chinhtruongba.driverapp.core.data.SessionRepository
import com.chinhtruongba.driverapp.core.model.AuthTokens
import com.chinhtruongba.driverapp.core.model.LatLng
import com.chinhtruongba.driverapp.core.network.TripApi
import com.chinhtruongba.driverapp.feature.location.Fix
import com.chinhtruongba.driverapp.feature.location.LocationSource
import com.chinhtruongba.driverapp.feature.location.LocationTracker
import kotlinx.coroutines.awaitCancellation
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import org.junit.Assert.assertEquals
import org.junit.Test

private class PermissionToggleSource : LocationSource {
    var granted = false
    var watchers = 0
    var active = 0
    override val last: StateFlow<Fix?> = MutableStateFlow(null)
    override fun hasForegroundPermission() = granted
    override fun hasBackgroundPermission() = false
    override fun updates(intervalMs: Long, minDistanceM: Float): Flow<Fix> = flow {
        watchers++
        active++
        try {
            emit(Fix(LatLng(21.0, 105.8)))
            awaitCancellation()
        } finally {
            active--
        }
    }
    override suspend fun currentFix(): Fix? = null
}

class LocationTrackerTest {
    private class Rig(val tracker: LocationTracker, val tokens: FakeTokenStore, val trip: CountingTripApi, val drivers: DriverRepository)

    private class CountingTripApi(private val inner: FakeTripApi = FakeTripApi()) : TripApi by inner {
        var livePushes = 0
        override suspend fun pushLiveLocation(body: JsonObject): JsonObject {
            livePushes++
            return inner.pushLiveLocation(body)
        }
    }

    private fun TestScope.rig(source: LocationSource, tokens: AuthTokens? = AuthTokens("a", "r")): Rig {
        val trip = CountingTripApi()
        val store = FakeTokenStore(tokens)
        val session = SessionRepository(store, FakeAuthApi(), trip, backgroundScope)
        val drivers = DriverRepository(trip, session, backgroundScope)
        return Rig(LocationTracker(source, drivers, session, backgroundScope), store, trip, drivers)
    }

    private fun TestScope.tracker(source: LocationSource): LocationTracker = rig(source).tracker

    @Test
    fun `granting location while visible starts the watch without waiting for onStart`() = runTest {
        val source = PermissionToggleSource()
        val tracker = tracker(source)

        tracker.onForeground()
        runCurrent()
        assertEquals("no permission yet", 0, source.watchers)

        source.granted = true
        tracker.onLocationPermissionChanged()
        runCurrent()
        assertEquals(1, source.watchers)

        tracker.onLocationPermissionChanged() // idempotent
        runCurrent()
        assertEquals(1, source.watchers)
        tracker.onBackground()
    }

    @Test
    fun `a permission result while in the background does not start the watch`() = runTest {
        val source = PermissionToggleSource().apply { granted = true }
        val tracker = tracker(source)
        tracker.onLocationPermissionChanged()
        runCurrent()
        assertEquals(0, source.watchers)
        tracker.onForeground()
        runCurrent()
        assertEquals(1, source.watchers)
        tracker.onBackground()
    }

    @Test
    fun `the watch runs only while visible and logged in, and stops on logout`() = runTest {
        val source = PermissionToggleSource().apply { granted = true }
        val r = rig(source, tokens = null)
        r.tracker.onForeground()
        runCurrent()
        assertEquals("logged out: no watch", 0, source.watchers)

        r.tokens.set(AuthTokens("a", "r"))
        runCurrent()
        assertEquals("login while visible starts it", 1, source.active)

        r.tokens.clear()
        runCurrent()
        assertEquals("logout stops it", 0, source.active)

        r.tracker.onBackground()
        r.tokens.set(AuthTokens("a", "r"))
        runCurrent()
        assertEquals("logged in but hidden: no watch", 0, source.active)
        r.tracker.onForeground()
        runCurrent()
        assertEquals(1, source.active)
        r.tracker.onBackground()
        runCurrent()
        assertEquals(0, source.active)
    }

    @Test
    fun `logout resets the push cadence so the next session pushes its first fix at once`() = runTest {
        val source = PermissionToggleSource().apply { granted = true }
        val r = rig(source)
        // Online driver so maybePush is allowed.
        r.trip.updateDriver("0901234567", buildJsonObject { put("status", "online") })
        r.drivers.refresh()
        r.tracker.onForeground()
        runCurrent()
        assertEquals("first fix pushed", 1, r.trip.livePushes)

        r.tokens.clear()
        runCurrent()
        r.drivers.refresh() // still online server-side
        r.tokens.set(AuthTokens("a", "r"))
        runCurrent()
        // Same position, well inside the cadence window: only a reset cadence pushes again.
        assertEquals(2, r.trip.livePushes)
        r.tracker.onBackground()
    }
}
