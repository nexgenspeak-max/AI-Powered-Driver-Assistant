package com.chinhtruongba.driverapp.core

import com.chinhtruongba.driverapp.core.model.AuthTokens
import com.chinhtruongba.driverapp.core.network.AuthHeaderInterceptor
import com.chinhtruongba.driverapp.core.network.RefreshAuthenticator
import com.chinhtruongba.driverapp.core.network.TokenRefresher
import com.chinhtruongba.driverapp.core.storage.TokenStore
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
import okhttp3.Request
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
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
        val refresher = TokenRefresher(store, refresh = { error("401") }, onLogout = {
            logouts++
            store.clear()
        })
        val results = (1..4).map { async { refresher.refreshAfter401("old") } }.awaitAll()
        assertTrue(results.all { it == null })
        assertEquals(1, logouts)
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
                .post(okhttp3.RequestBody.create(null, body)).build()
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
