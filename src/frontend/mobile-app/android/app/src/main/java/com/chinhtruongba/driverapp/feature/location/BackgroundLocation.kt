package com.chinhtruongba.driverapp.feature.location

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import androidx.core.content.ContextCompat
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.ProcessLifecycleOwner
import com.chinhtruongba.driverapp.core.data.ApplicationScope
import com.chinhtruongba.driverapp.core.data.DriverRepository
import com.chinhtruongba.driverapp.core.data.SessionRepository
import com.chinhtruongba.driverapp.core.model.LatLng
import com.chinhtruongba.driverapp.core.util.PushCadence
import com.chinhtruongba.driverapp.service.ServiceForegroundController
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
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
class BackgroundLocationCoordinator @Inject constructor(
    @ApplicationContext private val context: Context,
    private val session: SessionRepository,
    private val drivers: DriverRepository,
    private val source: LocationSource,
    private val foreground: ServiceForegroundController,
    @param:ApplicationScope private val scope: CoroutineScope,
) {
    private var started = false
    private var job: Job? = null
    private var lastPushAt = 0L
    private var lastPushed: LatLng? = null

    fun start() {
        if (started) return
        started = true
        // Re-evaluated whenever the app returns to the foreground, so a permission granted
        // in Settings while online starts tracking without another toggle.
        val foregrounded = ProcessLifecycleOwner.get().lifecycle.currentStateFlow
            .map { it.isAtLeast(Lifecycle.State.STARTED) }
            .distinctUntilChanged()
        scope.launch {
            combine(session.loggedIn, session.me.map { it.data?.isOnline == true }, foregrounded) { loggedIn, online, _ ->
                loggedIn && online && permitted()
            }.distinctUntilChanged().collect { active -> if (active) startTracking() else stopTracking() }
        }
    }

    private fun granted(p: String) = ContextCompat.checkSelfPermission(context, p) == PackageManager.PERMISSION_GRANTED

    /** The location-typed foreground service needs the real OS grants, not just the source's view. */
    private fun permitted(): Boolean =
        source.hasBackgroundPermission() &&
            granted(Manifest.permission.ACCESS_BACKGROUND_LOCATION) &&
            (granted(Manifest.permission.ACCESS_FINE_LOCATION) || granted(Manifest.permission.ACCESS_COARSE_LOCATION))

    private fun startTracking() {
        if (job?.isActive == true) return
        foreground.startLocation()
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
