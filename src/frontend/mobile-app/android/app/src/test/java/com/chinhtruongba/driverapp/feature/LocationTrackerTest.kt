package com.chinhtruongba.driverapp.feature

import com.chinhtruongba.driverapp.core.FakeTokenStore
import com.chinhtruongba.driverapp.core.data.DriverRepository
import com.chinhtruongba.driverapp.core.data.SessionRepository
import com.chinhtruongba.driverapp.core.model.AuthTokens
import com.chinhtruongba.driverapp.core.model.LatLng
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
import org.junit.Assert.assertEquals
import org.junit.Test

private class PermissionToggleSource : LocationSource {
    var granted = false
    var watchers = 0
    override val last: StateFlow<Fix?> = MutableStateFlow(null)
    override fun hasForegroundPermission() = granted
    override fun hasBackgroundPermission() = false
    override fun updates(intervalMs: Long, minDistanceM: Float): Flow<Fix> = flow {
        watchers++
        emit(Fix(LatLng(21.0, 105.8)))
        awaitCancellation()
    }
    override suspend fun currentFix(): Fix? = null
}

class LocationTrackerTest {
    private fun TestScope.tracker(source: LocationSource): LocationTracker {
        val trip = FakeTripApi()
        val session = SessionRepository(FakeTokenStore(AuthTokens("a", "r")), FakeAuthApi(), trip, backgroundScope)
        return LocationTracker(source, DriverRepository(trip, session, backgroundScope), backgroundScope)
    }

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
}
