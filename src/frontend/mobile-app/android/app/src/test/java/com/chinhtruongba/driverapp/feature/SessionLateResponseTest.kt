package com.chinhtruongba.driverapp.feature

import com.chinhtruongba.driverapp.core.FakeTokenStore
import com.chinhtruongba.driverapp.core.data.SessionRepository
import com.chinhtruongba.driverapp.core.model.AuthTokens
import com.chinhtruongba.driverapp.core.model.AuthUser
import com.chinhtruongba.driverapp.core.network.AuthApi
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.buildJsonObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/** `/auth/me` and account PATCH answers that arrive after logout must not repopulate `me`. */
class SessionLateResponseTest {
    private val user = AuthUser(id = "a1", name = "Khoa", phone = "0901234567", status = "offline")

    private class GatedAuthApi(private val inner: FakeAuthApi) : AuthApi by inner {
        var meGate: CompletableDeferred<Unit>? = null
        var updateGate: CompletableDeferred<Unit>? = null
        override suspend fun me(): AuthUser {
            meGate?.await()
            return inner.me()
        }
        override suspend fun updateAccount(id: String, body: JsonObject): AuthUser {
            updateGate?.await()
            return inner.updateAccount(id, body)
        }
    }

    @Test
    fun `refreshMe answered after logout leaves me empty`() = runTest {
        val api = GatedAuthApi(FakeAuthApi(user))
        val session = SessionRepository(FakeTokenStore(AuthTokens("a", "r")), api, FakeTripApi(), backgroundScope)
        val gate = CompletableDeferred<Unit>().also { api.meGate = it }

        val job = launch { session.refreshMe() }
        runCurrent()
        assertTrue(session.me.value.loading)

        session.logoutAndReset()
        gate.complete(Unit)
        job.join()

        assertNull("late /me dropped", session.me.value.data)
        assertEquals(false, session.me.value.loading)
    }

    @Test
    fun `profile or vehicle update answered after logout leaves me empty`() = runTest {
        val api = GatedAuthApi(FakeAuthApi(user))
        val session = SessionRepository(FakeTokenStore(AuthTokens("a", "r")), api, FakeTripApi(), backgroundScope)
        session.refreshMe()
        assertEquals("a1", session.me.value.data?.id)

        val gate = CompletableDeferred<Unit>().also { api.updateGate = it }
        val job = launch { runCatching { session.updateAccount(buildJsonObject { }) } }
        runCurrent()
        session.logoutAndReset()
        gate.complete(Unit)
        job.join()

        assertNull("late PATCH dropped", session.me.value.data)
    }

    @Test
    fun `a session that logged out and back in still drops the old response`() = runTest {
        val tokens = FakeTokenStore(AuthTokens("a", "r"))
        val api = GatedAuthApi(FakeAuthApi(user))
        val session = SessionRepository(tokens, api, FakeTripApi(), backgroundScope)
        val gate = CompletableDeferred<Unit>().also { api.meGate = it }

        val job = launch { session.refreshMe() }
        runCurrent()
        session.logoutAndReset()
        tokens.set(AuthTokens("b", "r2")) // a different driver signs in before the old answer lands
        gate.complete(Unit)
        job.join()

        assertNull("generation moved on", session.me.value.data)
    }
}
