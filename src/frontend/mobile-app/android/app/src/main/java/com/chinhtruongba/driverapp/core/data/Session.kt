package com.chinhtruongba.driverapp.core.data

import com.chinhtruongba.driverapp.core.model.AccountSettings
import com.chinhtruongba.driverapp.core.model.AuthTokens
import com.chinhtruongba.driverapp.core.model.AuthUser
import com.chinhtruongba.driverapp.core.network.AuthApi
import com.chinhtruongba.driverapp.core.network.TripApi
import com.chinhtruongba.driverapp.core.network.apiCall
import com.chinhtruongba.driverapp.core.storage.SessionGeneration
import com.chinhtruongba.driverapp.core.storage.TokenStore
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import javax.inject.Inject
import javax.inject.Qualifier
import javax.inject.Singleton

@Qualifier
@Retention(AnnotationRetention.BINARY)
annotation class ApplicationScope

/** One-shot load state for a cached query (React Query parity: keeps previous data while refetching). */
data class Loadable<out T>(
    val data: T? = null,
    val loading: Boolean = false,
    val error: Throwable? = null,
) {
    val isInitialLoading: Boolean get() = data == null && loading
}

/**
 * Auth session: tokens (Keystore-encrypted), the `['me']` profile (never persisted) and
 * logout. Every other repository resets itself when [loggedIn] turns false.
 */
@Singleton
class SessionRepository @Inject constructor(
    private val tokenStore: TokenStore,
    private val authApi: AuthApi,
    private val tripApi: TripApi,
    @param:ApplicationScope private val scope: CoroutineScope,
    private val generation: SessionGeneration = SessionGeneration(),
) {
    private val _me = MutableStateFlow<Loadable<AuthUser>>(Loadable())
    val me: StateFlow<Loadable<AuthUser>> = _me.asStateFlow()

    val hydrated: StateFlow<Boolean> get() = tokenStore.hydrated
    val loggedIn = tokenStore.tokens.map { it != null }.distinctUntilChanged()

    /** Phone of the signed-in driver, read synchronously by the `X-Driver-Phone` header. */
    fun currentPhone(): String? = _me.value.data?.phone

    suspend fun hydrate() {
        tokenStore.hydrate()
        if (tokenStore.current() != null) scope.launch { refreshMe() }
    }

    /**
     * Writes `me` only if the session that started the request is still the current one and
     * still signed in: a `/auth/me` or PATCH answer that lands after logout is dropped.
     */
    private suspend fun commitMe(startedIn: Long, write: () -> Unit): Boolean =
        generation.runIfCurrent(startedIn) {
            if (tokenStore.current() == null) {
                false
            } else {
                write()
                true
            }
        }

    suspend fun refreshMe() {
        val gen = generation.value
        if (tokenStore.current() == null) return
        _me.update { it.copy(loading = true, error = null) }
        try {
            val user = apiCall { authApi.me() }
            commitMe(gen) { _me.value = Loadable(user) }
        } catch (e: Exception) {
            if (e is kotlinx.coroutines.CancellationException) throw e
            commitMe(gen) { _me.update { it.copy(loading = false, error = e) } }
        }
    }

    suspend fun login(phone: String, password: String) {
        val tokens = apiCall {
            authApi.login(
                buildJsonObject {
                    put("role", "driver")
                    put("phone", phone)
                    put("password", password)
                },
            )
        }
        tokenStore.set(tokens)
        refreshMe()
    }

    suspend fun register(
        name: String,
        phone: String,
        email: String,
        password: String,
        vehicleType: String,
        vehiclePlate: String,
        vehicleName: String,
    ) {
        val res = apiCall {
            authApi.register(
                buildJsonObject {
                    put("role", "driver")
                    put("phone", phone)
                    put("name", name)
                    put("email", email)
                    put("password", password)
                    put("vehicle_type", vehicleType)
                    put("vehicle_plate", vehiclePlate)
                    put("vehicle_name", vehicleName)
                },
            )
        }
        val gen = generation.value
        tokenStore.set(AuthTokens(res.accessToken, res.refreshToken))
        // Prime the ['me'] cache with the returned user.
        if (res.user != null) commitMe(gen) { _me.value = Loadable(res.user) } else refreshMe()
    }

    /** Optimistically patch the cached profile (online toggle); returns the previous value. */
    fun patchMe(transform: (AuthUser) -> AuthUser): AuthUser? {
        val prev = _me.value.data ?: return null
        _me.value = _me.value.copy(data = transform(prev))
        return prev
    }

    /** Rollback of [patchMe]; a no-op once that account is gone (logout in between). */
    fun restoreMe(user: AuthUser) {
        _me.update { cur -> if (cur.data?.id == user.id) cur.copy(data = user) else cur }
    }

    suspend fun updateAccount(body: JsonObject): AuthUser {
        val gen = generation.value
        val id = _me.value.data?.id ?: error("no account")
        val user = apiCall { authApi.updateAccount(id, body) }
        commitMe(gen) { _me.value = Loadable(user) }
        return user
    }

    suspend fun settings(): AccountSettings {
        val id = _me.value.data?.id ?: error("no account")
        return apiCall { authApi.settings(id) }
    }

    suspend fun updateSettings(body: JsonObject): AccountSettings {
        val id = _me.value.data?.id ?: error("no account")
        return apiCall { authApi.updateSettings(id, body) }
    }

    /** Logout: best-effort PATCH offline, then wipe tokens and cached state. */
    suspend fun logout() {
        val phone = currentPhone()
        if (phone != null) {
            runCatching { apiCall { tripApi.updateDriver(phone, buildJsonObject { put("status", "offline") }) } }
        }
        logoutAndReset()
    }

    /**
     * Clear tokens and the in-memory caches (also used when refresh fails). Bumping the session
     * generation first stops a refresh still in flight from writing tokens back.
     */
    suspend fun logoutAndReset() {
        generation.invalidate {
            tokenStore.clear()
            _me.value = Loadable()
        }
    }
}
