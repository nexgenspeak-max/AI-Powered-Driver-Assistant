package com.chinhtruongba.driverapp.feature.location

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import androidx.core.content.ContextCompat
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.ProcessLifecycleOwner
import com.chinhtruongba.driverapp.app.PermissionGateway
import com.chinhtruongba.driverapp.core.data.ApplicationScope
import com.chinhtruongba.driverapp.core.data.DriverRepository
import com.chinhtruongba.driverapp.core.data.SessionRepository
import com.chinhtruongba.driverapp.core.model.LatLng
import com.chinhtruongba.driverapp.core.util.PushCadence
import com.chinhtruongba.driverapp.service.CzenForegroundService
import com.chinhtruongba.driverapp.service.ServiceForegroundController
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.launch
import javax.inject.Inject
import javax.inject.Singleton

/**
 * `driver-proximity-location-task` parity: while signed in and online, and once background
 * location is granted, run the location foreground service and push POST /drivers/me/location
 * (balanced, 30 s / 100 m) throttled to one push per 20 s unless the driver moved 150 m, plus
 * one immediate fix when tracking starts. Asking for the permission is the UI's job (going online).
 */
@Singleton
class BackgroundLocationCoordinator internal constructor(
    private val session: SessionRepository,
    private val drivers: DriverRepository,
    private val source: LocationSource,
    private val foreground: ServiceForegroundController,
    private val permissions: PermissionGateway,
    private val scope: CoroutineScope,
    /** Whether the app (process) is in the foreground. */
    private val foregrounded: () -> Flow<Boolean>,
    /** The real OS grants the location-typed foreground service needs. */
    private val osPermitted: () -> Boolean,
) {
    @Inject
    constructor(
        @ApplicationContext context: Context,
        session: SessionRepository,
        drivers: DriverRepository,
        source: LocationSource,
        foreground: ServiceForegroundController,
        permissions: PermissionGateway,
        @ApplicationScope scope: CoroutineScope,
    ) : this(
        session = session,
        drivers = drivers,
        source = source,
        foreground = foreground,
        permissions = permissions,
        scope = scope,
        foregrounded = {
            ProcessLifecycleOwner.get().lifecycle.currentStateFlow.map { it.isAtLeast(Lifecycle.State.STARTED) }
        },
        osPermitted = {
            fun granted(p: String) = ContextCompat.checkSelfPermission(context, p) == PackageManager.PERMISSION_GRANTED
            granted(Manifest.permission.ACCESS_BACKGROUND_LOCATION) &&
                (granted(Manifest.permission.ACCESS_FINE_LOCATION) || granted(Manifest.permission.ACCESS_COARSE_LOCATION))
        },
    )

    private var started = false
    private var job: Job? = null
    private var lastPushAt = 0L
    private var lastPushed: LatLng? = null

    fun start() {
        if (started) return
        started = true
        // "Wanted" (signed in, online, permitted) is evaluated on every change and on every
        // foreground/background transition; whether tracking actually runs is `job`. So a
        // permission granted in Settings, or a service start the OS refused earlier, is picked
        // up the next time the app comes to the foreground — no offline/online toggle needed.
        scope.launch {
            combine(
                session.loggedIn,
                session.me.map { it.data?.isOnline == true },
                foregrounded().distinctUntilChanged(),
            ) { loggedIn, online, inForeground ->
                (loggedIn && online && permitted()) to inForeground
            }.distinctUntilChanged().collect { (wanted, _) -> if (wanted) startTracking() else stopTracking() }
        }
        // The OS refused the location-typed service: stop the pushes that needed it.
        scope.launch {
            foreground.refused.collect { reason -> if (reason == CzenForegroundService.Reasons.LOCATION) stopTracking() }
        }
    }

    /** The location-typed foreground service needs the real OS grants, not just the source's view. */
    private fun permitted(): Boolean = source.hasBackgroundPermission() && osPermitted()

    private fun startTracking() {
        if (job?.isActive == true) return
        // Going online starts the service: make sure its notification can be shown (Android 13+).
        permissions.requestNotifications()
        if (!foreground.startLocation()) return
        lastPushAt = 0L
        lastPushed = null
        job = scope.launch {
            source.currentFix()?.let { push(it.latLng) }
            source.updates(30_000, 100f).collect { push(it.latLng) }
        }
    }

    private fun stopTracking() {
        if (job == null) return
        job?.cancel()
        job = null
        foreground.stopLocation()
    }

    private suspend fun push(here: LatLng) {
        val now = System.currentTimeMillis()
        if (!PushCadence.shouldPushBackground(now, lastPushAt, here, lastPushed)) return
        lastPushAt = now
        lastPushed = here
        try {
            drivers.pushBackground(here)
        } catch (e: CancellationException) {
            throw e
        } catch (_: Exception) {
            // next fix retries
        }
    }
}
