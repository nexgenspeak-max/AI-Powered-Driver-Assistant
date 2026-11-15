package com.chinhtruongba.driverapp.feature

import com.chinhtruongba.driverapp.core.FakeTokenStore
import com.chinhtruongba.driverapp.core.data.ME_RETRY_MIN_MS
import com.chinhtruongba.driverapp.core.data.SessionRepository
import com.chinhtruongba.driverapp.core.model.AuthTokens
import kotlinx.coroutines.test.advanceTimeBy
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Test

/** A failed `/auth/me` is retried with backoff while signed in, and at once on demand. */
class SessionRetryTest {
    @Test
    fun `a failed me is retried with backoff until it loads`() = runTest {
        val api = FakeAuthApi().apply { failMe = true }
        val session = SessionRepository(FakeTokenStore(AuthTokens("a", "r")), api, FakeTripApi(), backgroundScope)

        session.hydrate()
        runCurrent()
        assertEquals(1, api.meCalls)
        assertNotNull(session.me.value.error)
        assertNull(session.me.value.data)

        advanceTimeBy(ME_RETRY_MIN_MS + 1)
        assertEquals(2, api.meCalls)
        advanceTimeBy(ME_RETRY_MIN_MS * 2 + 1)
        assertEquals(3, api.meCalls)
        assertNotNull("the error stays visible between retries", session.me.value.error)

        api.failMe = false
        advanceTimeBy(ME_RETRY_MIN_MS * 4 + 1)
        assertEquals(4, api.meCalls)
        assertEquals("a1", session.me.value.data?.id)
        assertNull(session.me.value.error)

        advanceTimeBy(120_000)
        assertEquals("no more requests once loaded", 4, api.meCalls)
    }

    @Test
    fun `returning to the foreground or tapping retry skips the backoff wait`() = runTest {
        val api = FakeAuthApi().apply { failMe = true }
        val session = SessionRepository(FakeTokenStore(AuthTokens("a", "r")), api, FakeTripApi(), backgroundScope)
        session.hydrate()
        runCurrent()
        assertEquals(1, api.meCalls)

        api.failMe = false
        session.ensureMe(now = true)
        runCurrent()
        assertEquals(2, api.meCalls)
        assertEquals("a1", session.me.value.data?.id)
    }

    @Test
    fun `logout stops the retries`() = runTest {
        val api = FakeAuthApi().apply { failMe = true }
        val session = SessionRepository(FakeTokenStore(AuthTokens("a", "r")), api, FakeTripApi(), backgroundScope)
        session.hydrate()
        runCurrent()
        session.logoutAndReset()
        advanceTimeBy(120_000)
        assertEquals(1, api.meCalls)
        assertNull(session.me.value.error)
    }
}
