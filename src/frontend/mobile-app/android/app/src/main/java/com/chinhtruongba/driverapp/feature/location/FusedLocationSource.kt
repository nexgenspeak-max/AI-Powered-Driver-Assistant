package com.chinhtruongba.driverapp.feature.location

import android.Manifest
import android.annotation.SuppressLint
import android.content.Context
import android.content.pm.PackageManager
import android.os.Looper
import androidx.core.content.ContextCompat
import com.chinhtruongba.driverapp.core.model.LatLng
import com.google.android.gms.location.LocationCallback
import com.google.android.gms.location.LocationRequest
import com.google.android.gms.location.LocationResult
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.suspendCancellableCoroutine
import javax.inject.Inject
import javax.inject.Singleton
import kotlin.coroutines.resume

/** Fused location provider, balanced accuracy (expo-location `Accuracy.Balanced`). */
@Singleton
class FusedLocationSource @Inject constructor(@ApplicationContext private val context: Context) : LocationSource {
    private val client = LocationServices.getFusedLocationProviderClient(context)
    private val _last = MutableStateFlow<Fix?>(null)
    override val last: StateFlow<Fix?> = _last.asStateFlow()

    override fun hasForegroundPermission(): Boolean =
        ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED ||
            ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED

    override fun hasBackgroundPermission(): Boolean =
        ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_BACKGROUND_LOCATION) == PackageManager.PERMISSION_GRANTED

    private fun android.location.Location.toFix() = Fix(LatLng(latitude, longitude), if (hasBearing()) bearing else null, time)

    @SuppressLint("MissingPermission")
    override fun updates(intervalMs: Long, minDistanceM: Float): Flow<Fix> = callbackFlow {
        if (!hasForegroundPermission()) {
            close()
            return@callbackFlow
        }
        val req = LocationRequest.Builder(Priority.PRIORITY_BALANCED_POWER_ACCURACY, intervalMs)
            .setMinUpdateDistanceMeters(minDistanceM)
            .build()
        val cb = object : LocationCallback() {
            override fun onLocationResult(result: LocationResult) {
                result.lastLocation?.toFix()?.let {
                    _last.value = it
                    trySend(it)
                }
            }
        }
        client.requestLocationUpdates(req, cb, Looper.getMainLooper())
        awaitClose { client.removeLocationUpdates(cb) }
    }

    @SuppressLint("MissingPermission")
    override suspend fun currentFix(): Fix? {
        if (!hasForegroundPermission()) return _last.value
        return try {
            suspendCancellableCoroutine { cont ->
                client.getCurrentLocation(Priority.PRIORITY_HIGH_ACCURACY, null)
                    .addOnSuccessListener { loc -> cont.resume(loc?.toFix()?.also { _last.value = it } ?: _last.value) }
                    .addOnFailureListener { cont.resume(_last.value) }
            }
        } catch (e: CancellationException) {
            throw e
        } catch (_: Exception) {
            _last.value
        }
    }
}
