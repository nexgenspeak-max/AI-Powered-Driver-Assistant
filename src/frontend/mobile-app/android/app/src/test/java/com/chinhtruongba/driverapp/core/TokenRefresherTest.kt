package com.chinhtruongba.driverapp.core

import com.chinhtruongba.driverapp.core.model.AuthTokens
import com.chinhtruongba.driverapp.core.network.AuthHeaderInterceptor
import com.chinhtruongba.driverapp.core.network.RefreshAuthenticator
import com.chinhtruongba.driverapp.core.network.TokenRefresher
import com.chinhtruongba.driverapp.core.storage.SessionGeneration
import com.chinhtruongba.driverapp.core.storage.TokenStore
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.test.runTest
import mockwebserver3.Dispatcher
import mockwebserver3.MockResponse
import mockwebserver3.MockWebServer
import mockwebserver3.RecordedRequest
import okhttp3.OkHttpClient
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.ResponseBody.Companion.toResponseBody
import retrofit2.HttpException
import okhttp3.Request
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import java.io.IOException
import java.util.concurrent.Callable
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicInteger

class FakeTokenStore(initial: AuthTokens?) : TokenStore {
    private val state = MutableStateFlow(initial)
    override val tokens: StateFlow<AuthTokens?> = state
    override val hydrated: StateFlow<Boolean> = MutableStateFlow(true)
    override suspend fun hydrate() = Unit
    override suspend fun set(tokens: AuthTokens) { state.value = tokens }
    override suspend fun clear() { state.value = null }
}

private fun http(code: Int) = HttpException(retrofit2.Response.error<Any>(code, "{}".toResponseBody()))

class TokenRefresherTest {
    @Test
    fun `concurrent 401s collapse into one refresh and all reuse the new token`() = runTest {
        val store = FakeTokenStore(AuthTokens("old", "r1"))
        val calls = AtomicInteger()
        val refresher = TokenRefresher(store, refresh = { rt ->
            calls.incrementAndGet()
            assertEquals("r1", rt)
            delay(50)
            AuthTokens("new", "r2")
        }, onLogout = { error("must not log out") })

        val results = (1..8).map { async { refresher.refreshAfter401("old") } }.awaitAll()

        assertEquals(1, calls.get())
        assertTrue(results.all { it == "new" })
        assertEquals(AuthTokens("new", "r2"), store.current())
    }

    @Test
    fun `failed refresh logs out once and returns null`() = runTest {
        val store = FakeTokenStore(AuthTokens("old", "r1"))
        var logouts = 0
        val refresher = TokenRefresher(store, refresh = { throw http(401) }, onLogout = {
            logouts++
            store.clear()
        })
        val results = (1..4).map { async { refresher.refreshAfter401("old") } }.awaitAll()
        assertTrue(results.all { it == null })
        assertEquals(1, logouts)
        assertNull(store.current())
    }

    @Test
    fun `400 and 403 from refresh also log out`() = runTest {
        for (code in listOf(400, 403)) {
            val store = FakeTokenStore(AuthTokens("old", "r1"))
            var logouts = 0
            val refresher = TokenRefresher(store, refresh = { throw http(code) }, onLogout = {
                logouts++
                store.clear()
            })
            assertNull(refresher.refreshAfter401("old"))
            assertEquals("code $code", 1, logouts)
        }
    }

    @Test
    fun `network error or 5xx fails the request but keeps the session`() = runTest {
        val failures = listOf<Exception>(IOException("offline"), http(500), http(503))
        for (failure in failures) {
            val store = FakeTokenStore(AuthTokens("old", "r1"))
            val refresher = TokenRefresher(store, refresh = { throw failure }, onLogout = { error("must not log out on $failure") })
            assertNull(refresher.refreshAfter401("old"))
            assertEquals(AuthTokens("old", "r1"), store.current())
        }
    }

    @Test
    fun `logout while a refresh is in flight never writes tokens back`() = runTest {
        val store = FakeTokenStore(AuthTokens("old", "r1"))
        val gate = CompletableDeferred<Unit>()
        val refresher = TokenRefresher(store, refresh = {
            gate.await()
            AuthTokens("new", "r2")
        }, onLogout = { store.clear() })

        val pending = async { refresher.refreshAfter401("old") }
        testScheduler.runCurrent()
        store.clear() // the user logs out meanwhile
        gate.complete(Unit)

        assertNull(pending.await())
        assertNull(store.current())
    }
}

class SessionGenerationTest {
    @Test
    fun `a refresh that finishes after the session generation moved on is dropped`() = runTest {
        val store = FakeTokenStore(AuthTokens("old", "r1"))
        val generation = SessionGeneration()
        val gate = CompletableDeferred<Unit>()
        val refresher = TokenRefresher(store, refresh = {
            gate.await()
            AuthTokens("new", "r2")
        }, onLogout = { error("must not log out") }, generation = generation)

        val pending = async { refresher.refreshAfter401("old") }
        testScheduler.runCurrent()
        generation.invalidate() // logout bumps the generation (tokens not yet cleared)
        gate.complete(Unit)

        assertNull(pending.await())
        assertEquals(AuthTokens("old", "r1"), store.current())
    }

    @Test
    fun `logoutAndReset bumps the generation and clears tokens atomically`() = runTest {
        val store = FakeTokenStore(AuthTokens("a", "r"))
        val generation = SessionGeneration()
        val session = com.chinhtruongba.driverapp.core.data.SessionRepository(
            store, com.chinhtruongba.driverapp.feature.FakeAuthApi(), com.chinhtruongba.driverapp.feature.FakeTripApi(), backgroundScope, generation,
        )
        val before = generation.value
        session.logoutAndReset()
        assertEquals(before + 1, generation.value)
        assertNull(store.current())
    }
}

/** End-to-end through OkHttp: parallel requests that get 401 trigger exactly one /auth/refresh. */
class RefreshAuthenticatorTest {
    private lateinit var server: MockWebServer
    private val refreshCount = AtomicInteger()

    @Before
    fun setUp() {
        server = MockWebServer()
        server.dispatcher = object : Dispatcher() {
            override fun dispatch(request: RecordedRequest): MockResponse {
                val path = request.url.encodedPath
                if (path.endsWith("/auth/refresh")) {
                    refreshCount.incrementAndGet()
                    Thread.sleep(100)
                    return MockResponse.Builder().code(200).body("""{"access_token":"new","refresh_token":"r2"}""").build()
                }
                val auth = request.headers["Authorization"]
                return if (auth == "Bearer new") MockResponse.Builder().code(200).body("{}").build()
                else MockResponse.Builder().code(401).body("""{"detail":"expired"}""").build()
            }
        }
        server.start()
    }

    @After
    fun tearDown() = server.close()

    @Test
    fun `parallel 401 responses replay once after a single refresh`() {
        val store = FakeTokenStore(AuthTokens("old", "r1"))
        val plain = OkHttpClient()
        val refresher = TokenRefresher(store, refresh = { rt ->
            val body = """{"refresh_token":"$rt"}""".toByteArray()
            val req = Request.Builder().url(server.url("/api/v1/auth/refresh"))
                .post(body.toRequestBody()).build()
            plain.newCall(req).execute().use { res ->
                check(res.isSuccessful)
                AuthTokens("new", "r2")
            }
        }, onLogout = { store.clear() })
        val client = OkHttpClient.Builder()
            .addInterceptor(AuthHeaderInterceptor(store) { "0901234567" })
            .authenticator(RefreshAuthenticator(refresher))
            .build()

        val pool = Executors.newFixedThreadPool(6)
        val codes = (1..6).map {
            pool.submit(Callable { client.newCall(Request.Builder().url(server.url("/api/v1/drivers/me/context")).build()).execute().use { it.code } })
        }.map { it.get() }
        pool.shutdown()

        assertTrue(codes.all { it == 200 })
        assertEquals(1, refreshCount.get())
    }

    @Test
    fun `a request still unauthorized after the replay is not retried again`() {
        val store = FakeTokenStore(AuthTokens("old", "r1"))
        val refresher = TokenRefresher(store, refresh = { AuthTokens("still-bad", "r2") }, onLogout = { store.clear() })
        val client = OkHttpClient.Builder()
            .addInterceptor(AuthHeaderInterceptor(store) { null })
            .authenticator(RefreshAuthenticator(refresher))
            .build()
        val code = client.newCall(Request.Builder().url(server.url("/api/v1/drivers/me/context")).build()).execute().use { it.code }
        assertEquals(401, code)
        // one original + one replay
        assertEquals(2, server.requestCount)
    }
}
