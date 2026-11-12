package com.chinhtruongba.driverapp.feature.location

import com.chinhtruongba.driverapp.core.data.ApplicationScope
import com.chinhtruongba.driverapp.core.data.DriverRepository
import com.chinhtruongba.driverapp.core.model.DriverContext
import com.chinhtruongba.driverapp.core.model.LatLng
import com.chinhtruongba.driverapp.core.model.TripStatus
import com.chinhtruongba.driverapp.core.util.PushCadence
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import javax.inject.Inject
import javax.inject.Singleton

/** Stops the live push cares about: pickups of confirmed trips, dropoffs of picked-up ones. */
fun activeStops(ctx: DriverContext?): List<LatLng> {
    if (ctx == null) return emptyList()
    ctx.optimizedRoute?.stops?.takeIf { it.isNotEmpty() }?.let { s -> return s.map { it.latLng } }
    return ctx.activeTrips.mapNotNull { t -> if (t.status == TripStatus.PickedUp) t.dropoff else t.pickup }
}

/**
 * Foreground live push (useLiveDriverLocation): watch at 3 s / 5 m plus a 15 s wall-clock tick,
 * POST /drivers/me/location/live while online on the distance-based cadence, and immediate pushes
 * on accept / trip_confirmed / new active trip / navigation start / proximity setting changes.
 */
@Singleton
class LocationTracker @Inject constructor(
    private val source: LocationSource,
    private val drivers: DriverRepository,
    @param:ApplicationScope private val scope: CoroutineScope,
) {
    private var watchJob: Job? = null
    private var tickJob: Job? = null
    private var lastPushAt = 0L
    private var lastPushed: LatLng? = null

    private fun isOnline(): Boolean = drivers.context.value.data?.driver?.status == "online"

    /** Called while the app is in the foreground and signed in. */
    fun startForegroundWatch() {
        if (watchJob?.isActive == true) return
        if (!source.hasForegroundPermission()) return
        watchJob = scope.launch {
            source.updates(3_000, 5f).collect { fix -> maybePush(fix.latLng) }
        }
        tickJob = scope.launch {
            while (isActive) {
                delay(15_000)
                val fix = source.last.value
                val stale = fix == null || System.currentTimeMillis() - fix.timeMs > 10_000
                val here = if (stale) source.currentFix() else fix
                here?.let { maybePush(it.latLng) }
            }
        }
    }

    fun stopForegroundWatch() {
        watchJob?.cancel()
        tickJob?.cancel()
        watchJob = null
        tickJob = null
    }

    private suspend fun maybePush(here: LatLng) {
        if (!isOnline()) return
        val now = System.currentTimeMillis()
        if (!PushCadence.shouldPush(now, lastPushAt, here, lastPushed, activeStops(drivers.context.value.data))) return
        lastPushAt = now
        lastPushed = here
        try {
            drivers.pushLive(here)
        } catch (e: CancellationException) {
            throw e
        } catch (_: Exception) {
            // next tick retries
        }
    }

    /** pushImmediateLocation(scope?): one fresh fix straight to /location/live. */
    fun pushImmediate(proximityScope: String? = null) {
        scope.launch {
            val fix = source.currentFix() ?: return@launch
            lastPushAt = System.currentTimeMillis()
            lastPushed = fix.latLng
            runCatching { drivers.pushLive(fix.latLng, proximityScope) }
        }
    }
}
