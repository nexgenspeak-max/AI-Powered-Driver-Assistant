package com.chinhtruongba.driverapp.core.data

import com.chinhtruongba.driverapp.core.model.CreateTripRequest
import com.chinhtruongba.driverapp.core.model.DriverContext
import com.chinhtruongba.driverapp.core.model.EarningsSummary
import com.chinhtruongba.driverapp.core.model.LatLng
import com.chinhtruongba.driverapp.core.model.NavigationRoute
import com.chinhtruongba.driverapp.core.model.Trip
import com.chinhtruongba.driverapp.core.model.VoiceToken
import com.chinhtruongba.driverapp.core.network.TripApi
import com.chinhtruongba.driverapp.core.network.apiCall
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import javax.inject.Inject
import javax.inject.Singleton

/**
 * The `['driverContext']` query plus every trip/driver mutation. In-memory only, like the RN
 * app (no persisted cache); keeps the previous data while refetching.
 */
@Singleton
class DriverRepository @Inject constructor(
    private val api: TripApi,
    private val session: SessionRepository,
    @param:ApplicationScope private val scope: CoroutineScope,
) {
    private val _context = MutableStateFlow<Loadable<DriverContext>>(Loadable())
    val context: StateFlow<Loadable<DriverContext>> = _context.asStateFlow()

    private val summaries = mutableMapOf<String, MutableStateFlow<Loadable<EarningsSummary>>>()
    private var inflight: Job? = null
    private var lastFetchAt = 0L

    init {
        scope.launch {
            session.loggedIn.collect { loggedIn ->
                if (!loggedIn) {
                    inflight?.cancel()
                    _context.value = Loadable()
                    summaries.values.forEach { it.value = Loadable() }
                    lastFetchAt = 0L
                }
            }
        }
    }

    /** React Query `invalidateQueries(['driverContext'])`: refetch in the background. */
    fun invalidate(fresh: Boolean = false) {
        if (inflight?.isActive == true && !fresh) return
        inflight = scope.launch { refresh(fresh) }
    }

    /** Refetch only if older than the 60 s stale time. */
    fun ensureFresh() {
        if (System.currentTimeMillis() - lastFetchAt > 60_000 || _context.value.data == null) invalidate()
    }

    suspend fun refresh(fresh: Boolean = false) {
        _context.update { it.copy(loading = true, error = null) }
        try {
            val ctx = apiCall { api.context(if (fresh) true else null) }
            lastFetchAt = System.currentTimeMillis()
            _context.value = Loadable(ctx)
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            _context.update { it.copy(loading = false, error = e) }
        }
    }

    /** Optimistic online toggle on `['me']` with rollback. */
    suspend fun setOnline(online: Boolean) {
        val phone = session.currentPhone() ?: return
        val prev = session.patchMe { it.copy(status = if (online) "online" else "offline") }
        _context.update { l -> l.copy(data = l.data?.let { it.copy(driver = it.driver.copy(status = if (online) "online" else "offline")) }) }
        try {
            apiCall { api.updateDriver(phone, buildJsonObject { put("status", if (online) "online" else "offline") }) }
            invalidate()
        } catch (e: Exception) {
            if (e is CancellationException) throw e
            prev?.let { session.restoreMe(it) }
            invalidate()
            throw e
        }
    }

    suspend fun acceptTrip(id: String): Trip = apiCall { api.updateTrip(id, buildJsonObject { put("status", "confirmed") }) }.also { invalidate() }

    suspend fun rejectTrip(id: String): Trip = apiCall { api.updateTrip(id, buildJsonObject { put("status", "rejected") }) }.also { invalidate() }

    suspend fun cancelTrip(id: String): Trip = apiCall { api.updateTrip(id, buildJsonObject { put("status", "cancelled_by_driver") }) }.also { invalidate() }

    /** Arrival actions carry a fresh GPS fix; the server answers 409 + detail when too far. */
    suspend fun advanceTrip(id: String, status: String, at: LatLng?): Trip = apiCall {
        api.updateTrip(
            id,
            buildJsonObject {
                put("status", status)
                if (at != null) {
                    put("lat", at.lat)
                    put("lng", at.lng)
                }
            },
        )
    }.also { invalidate() }

    suspend fun createTrip(req: CreateTripRequest): Trip = apiCall { api.createTrip(req) }.also { invalidate() }

    suspend fun trip(id: String): Trip = apiCall { api.trip(id) }

    fun summary(period: String): StateFlow<Loadable<EarningsSummary>> = summaries.getOrPut(period) { MutableStateFlow(Loadable()) }

    suspend fun loadSummary(period: String) {
        val flow = summaries.getOrPut(period) { MutableStateFlow(Loadable()) }
        flow.update { it.copy(loading = true, error = null) }
        try {
            flow.value = Loadable(apiCall { api.earningsSummary(period) })
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            flow.update { it.copy(loading = false, error = e) }
        }
    }

    suspend fun navigation(from: LatLng, to: LatLng): NavigationRoute = apiCall { api.navigation(from.lat, from.lng, to.lat, to.lng) }

    suspend fun pushLive(at: LatLng, scope: String? = null) {
        apiCall {
            api.pushLiveLocation(
                buildJsonObject {
                    put("lat", at.lat)
                    put("lng", at.lng)
                    if (scope != null) put("proximity_scope", scope)
                },
            )
        }
    }

    suspend fun pushBackground(at: LatLng) {
        apiCall { api.pushLocation(buildJsonObject { put("lat", at.lat); put("lng", at.lng) }) }
    }

    suspend fun voiceToken(phone: String, lang: String): VoiceToken = apiCall { api.voiceToken(phone, lang) }
}
