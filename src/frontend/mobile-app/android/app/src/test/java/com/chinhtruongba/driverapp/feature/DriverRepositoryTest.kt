package com.chinhtruongba.driverapp.feature

import com.chinhtruongba.driverapp.core.FakeTokenStore
import com.chinhtruongba.driverapp.core.data.DriverRepository
import com.chinhtruongba.driverapp.core.data.SessionRepository
import com.chinhtruongba.driverapp.core.model.AuthTokens
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class DriverRepositoryTest {
    @Test
    fun `online toggle is optimistic and rolls back on failure`() = runTest {
        val trip = FakeTripApi()
        val session = SessionRepository(FakeTokenStore(AuthTokens("a", "r")), FakeAuthApi(), trip, backgroundScope)
        val drivers = DriverRepository(trip, session, backgroundScope)
        session.refreshMe()
        assertFalse(session.me.value.data!!.isOnline)

        drivers.setOnline(true)
        assertTrue(session.me.value.data!!.isOnline)

        trip.failUpdateDriver = true
        val failed = runCatching { drivers.setOnline(false) }
        assertTrue(failed.isFailure)
        assertTrue("rolled back to online", session.me.value.data!!.isOnline)
    }

    @Test
    fun `logout wipes tokens and the cached context`() = runTest {
        val trip = FakeTripApi()
        val tokens = FakeTokenStore(AuthTokens("a", "r"))
        val session = SessionRepository(tokens, FakeAuthApi(), trip, backgroundScope)
        val drivers = DriverRepository(trip, session, backgroundScope)
        session.refreshMe()
        drivers.refresh()
        assertTrue(drivers.context.value.data != null)
        session.logout()
        runCurrent()
        assertEquals(null, tokens.current())
        assertEquals(null, drivers.context.value.data)
        assertEquals("offline", trip.context.driver.status)
    }

    @Test
    fun `the context is not fetched before me is loaded and is fetched as soon as it is`() = runTest {
        val trip = FakeTripApi()
        val session = SessionRepository(FakeTokenStore(AuthTokens("a", "r")), FakeAuthApi(), trip, backgroundScope)
        val drivers = DriverRepository(trip, session, backgroundScope)

        drivers.ensureFresh() // ViewModel init while /auth/me is still loading
        drivers.invalidate()
        drivers.refresh()
        runCurrent()
        assertEquals("no request without the X-Driver-Phone header", 0, trip.contextCalls)

        session.refreshMe()
        runCurrent()
        assertEquals(1, trip.contextCalls)
        assertTrue(drivers.context.value.data != null)
    }

    @Test
    fun `an invalidation during a fetch runs one more fetch after it`() = runTest {
        val trip = FakeTripApi()
        val session = SessionRepository(FakeTokenStore(AuthTokens("a", "r")), FakeAuthApi(), trip, backgroundScope)
        val drivers = DriverRepository(trip, session, backgroundScope)
        val gate = CompletableDeferred<Unit>().also { trip.contextGate = it }
        session.refreshMe()
        runCurrent()
        assertEquals("first fetch in flight", 1, trip.contextCalls)

        // The driver accepts a trip (or a trip_offer arrives) while that fetch is in flight.
        trip.context = trip.context.copy(hasPendingNudge = true)
        drivers.invalidate()
        drivers.invalidate()
        runCurrent()
        assertEquals(1, trip.contextCalls)

        trip.contextGate = null
        gate.complete(Unit)
        runCurrent()
        assertEquals("exactly one follow-up fetch", 2, trip.contextCalls)
        assertTrue("the change is not missed", drivers.context.value.data!!.hasPendingNudge)
    }

    @Test
    fun `a context answer that lands after logout is dropped`() = runTest {
        val trip = FakeTripApi()
        val session = SessionRepository(FakeTokenStore(AuthTokens("a", "r")), FakeAuthApi(), trip, backgroundScope)
        val drivers = DriverRepository(trip, session, backgroundScope)
        session.refreshMe()
        runCurrent()
        val gate = CompletableDeferred<Unit>().also { trip.contextGate = it }

        val pull = launch { drivers.refresh() } // pull-to-refresh: not the repository's own job
        runCurrent()
        session.logoutAndReset()
        runCurrent()
        gate.complete(Unit)
        pull.join()
        runCurrent()

        assertEquals("the previous account's context is not written back", null, drivers.context.value.data)
    }
}
