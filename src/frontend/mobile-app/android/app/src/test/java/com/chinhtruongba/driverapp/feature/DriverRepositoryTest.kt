package com.chinhtruongba.driverapp.feature

import com.chinhtruongba.driverapp.core.FakeTokenStore
import com.chinhtruongba.driverapp.core.data.DriverRepository
import com.chinhtruongba.driverapp.core.data.SessionRepository
import com.chinhtruongba.driverapp.core.model.AuthTokens
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
}
