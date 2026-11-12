package com.chinhtruongba.driverapp.feature.location

import com.chinhtruongba.driverapp.core.model.LatLng
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.StateFlow

/** One GPS fix. [heading] in degrees when the provider knows it. */
data class Fix(val latLng: LatLng, val heading: Float? = null, val timeMs: Long = System.currentTimeMillis())

/** Platform location. Prod: fused provider; demo: a scripted position around Hà Nội. */
interface LocationSource {
    /** Latest known fix from any watcher (null until the first fix). */
    val last: StateFlow<Fix?>

    fun hasForegroundPermission(): Boolean
    fun hasBackgroundPermission(): Boolean

    /** Balanced-accuracy updates (foreground watch: 3 s / 5 m). */
    fun updates(intervalMs: Long, minDistanceM: Float): Flow<Fix>

    /** A fresh fix for arrival actions; falls back to [last]. */
    suspend fun currentFix(): Fix?
}
