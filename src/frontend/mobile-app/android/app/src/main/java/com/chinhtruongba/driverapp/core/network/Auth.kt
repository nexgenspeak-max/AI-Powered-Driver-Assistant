package com.chinhtruongba.driverapp.core.network

import com.chinhtruongba.driverapp.core.model.ApiErrorBody
import com.chinhtruongba.driverapp.core.model.ApiException
import com.chinhtruongba.driverapp.core.model.AuthTokens
import com.chinhtruongba.driverapp.core.storage.TokenStore
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import okhttp3.Authenticator
import okhttp3.Interceptor
import okhttp3.Request
import okhttp3.Response
import okhttp3.Route
import retrofit2.HttpException

/** Header marking a request that was already replayed once after a refresh (`_retry`). */
internal const val RETRY_HEADER = "X-Czen-Retry"

/**
 * One shared refresh for many concurrent 401s. The server rotates refresh tokens, so two
 * refreshes in flight would revoke each other: a [Mutex] serialises them and late callers
 * reuse the token the first caller obtained. On failure the session is wiped (logoutAndReset).
 */
class TokenRefresher(
    private val tokenStore: TokenStore,
    private val refresh: suspend (refreshToken: String) -> AuthTokens,
    private val onLogout: suspend () -> Unit,
) {
    private val mutex = Mutex()

    /** @param failedAccessToken the access token the 401 request carried. */
    suspend fun refreshAfter401(failedAccessToken: String?): String? = mutex.withLock {
        val current = tokenStore.current() ?: return@withLock null
        // Someone else already refreshed while we waited for the lock: reuse it.
        if (failedAccessToken != null && current.accessToken != failedAccessToken) return@withLock current.accessToken
        try {
            val fresh = refresh(current.refreshToken)
            tokenStore.set(fresh)
            fresh.accessToken
        } catch (e: CancellationException) {
            throw e
        } catch (_: Exception) {
            onLogout()
            null
        }
    }
}

/** Adds `Authorization`, JSON content type and (trip API) `X-Driver-Phone`. */
class AuthHeaderInterceptor(
    private val tokenStore: TokenStore,
    private val driverPhone: () -> String?,
) : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val b = chain.request().newBuilder()
        tokenStore.current()?.let { b.header("Authorization", "Bearer ${it.accessToken}") }
        b.header("Content-Type", "application/json")
        driverPhone()?.takeIf { it.isNotBlank() }?.let { b.header("X-Driver-Phone", it) }
        return chain.proceed(b.build())
    }
}

/** OkHttp [Authenticator]: on 401 refresh once (single-flight) and replay the request once. */
class RefreshAuthenticator(private val refresher: TokenRefresher) : Authenticator {
    override fun authenticate(route: Route?, response: Response): Request? {
        val req = response.request
        if (req.header(RETRY_HEADER) != null) return null
        val path = req.url.encodedPath
        if (path.endsWith("/auth/login") || path.endsWith("/auth/register") || path.endsWith("/auth/refresh")) return null
        val sent = req.header("Authorization")?.removePrefix("Bearer ")
        // OkHttp calls authenticators on its own worker thread, never the main thread, so
        // bridging into the suspend Mutex here does not block UI.
        val token = runBlocking { refresher.refreshAfter401(sent) } ?: return null
        return req.newBuilder()
            .header("Authorization", "Bearer $token")
            .header(RETRY_HEADER, "1")
            .build()
    }
}

fun refreshBody(refreshToken: String) = buildJsonObject { put("refresh_token", refreshToken) }

private val errorJson = Json { ignoreUnknownKeys = true }

/** Maps Retrofit / IO failures to [ApiException] with the server's `detail`. */
fun Throwable.toApiException(): ApiException = when (this) {
    is ApiException -> this
    is HttpException -> {
        val detail = runCatching {
            response()?.errorBody()?.string()?.let { errorJson.decodeFromString(ApiErrorBody.serializer(), it).detail }
        }.getOrNull()
        ApiException(code(), detail, this)
    }
    else -> ApiException(-1, null, this)
}

/** Runs [block] mapping any non-cancellation failure to [ApiException]. */
suspend fun <T> apiCall(block: suspend () -> T): T = try {
    block()
} catch (e: CancellationException) {
    throw e
} catch (e: Exception) {
    throw e.toApiException()
}
