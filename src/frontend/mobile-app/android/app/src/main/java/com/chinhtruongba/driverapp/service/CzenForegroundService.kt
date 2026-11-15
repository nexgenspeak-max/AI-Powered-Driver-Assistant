package com.chinhtruongba.driverapp.service

import android.annotation.SuppressLint
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.app.ServiceCompat
import androidx.core.content.ContextCompat
import com.chinhtruongba.driverapp.MainActivity
import com.chinhtruongba.driverapp.R
import com.chinhtruongba.driverapp.feature.voice.ForegroundController
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.asSharedFlow
import javax.inject.Inject
import javax.inject.Singleton

/**
 * The single foreground service (id 4471, channel "Czen Driver", types microphone|location):
 * live voice call, wake-word listening and background location share one notification. The
 * message follows the most important active reason.
 */
// android.util.Log on purpose: no Timber tree is planted (Timber only arrives transitively via LiveKit).
@SuppressLint("LogNotTimber")
class CzenForegroundService : android.app.Service() {
    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val wanted = Reasons.current
        ensureChannel(this)
        // A typed start can be refused (missing runtime permission, microphone type from the
        // background). The service then stays in the foreground for the reasons that were
        // already running; only the new ones are dropped.
        val running = ForegroundStart.negotiate(wanted, Reasons.running) { reasons ->
            runCatching {
                ServiceCompat.startForeground(this, NOTIFICATION_ID, notification(reasons), foregroundTypeFor(reasons, Build.VERSION.SDK_INT))
            }.isSuccess
        }
        if (running != wanted) Log.w(TAG, "foreground start refused for ${(wanted - running).size} reason(s); ${running.size} kept")
        Reasons.settle(wanted, running)
        if (running.isEmpty()) {
            // Nothing to run and nothing was running: satisfy the startForegroundService()
            // contract with a type that has no runtime precondition, then stop.
            runCatching {
                ServiceCompat.startForeground(this, NOTIFICATION_ID, notification(wanted), fallbackForegroundType(Build.VERSION.SDK_INT))
            }.onFailure { Log.w(TAG, "fallback foreground start failed: ${it.javaClass.simpleName}") }
            ServiceCompat.stopForeground(this, ServiceCompat.STOP_FOREGROUND_REMOVE)
            stopSelf()
        }
        return START_NOT_STICKY
    }

    override fun onDestroy() {
        Reasons.running = emptySet()
        super.onDestroy()
    }

    private fun notification(reasons: Set<String>): Notification {
        val msg = when {
            Reasons.CALL in reasons -> getString(R.string.fg_call_message)
            Reasons.WAKE in reasons -> getString(R.string.fg_wake_message)
            else -> getString(R.string.fg_location_message)
        }
        val title = if (reasons == setOf(Reasons.LOCATION)) getString(R.string.fg_location_title) else getString(R.string.fg_title)
        val open = PendingIntent.getActivity(
            this,
            0,
            Intent(this, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP),
            PendingIntent.FLAG_IMMUTABLE,
        )
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_stat_czen)
            .setContentTitle(title)
            .setContentText(msg)
            .setOngoing(true)
            .setContentIntent(open)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .build()
    }

    object Reasons {
        const val CALL = "call"
        const val WAKE = "wake"
        const val LOCATION = "location"

        /** Reasons the owners asked for. */
        @Volatile
        var current: Set<String> = emptySet()

        /** Reasons the service is actually in the foreground for (set by the service). */
        @Volatile
        var running: Set<String> = emptySet()

        /** Reasons dropped because the OS refused them; see [ForegroundController.refused]. */
        val refused = MutableSharedFlow<String>(extraBufferCapacity = 8)

        /**
         * The outcome of a start: [nowRunning] out of [wanted]. Refused reasons leave [current]
         * (it never claims a service that does not run) and are reported to their owners.
         */
        @Synchronized
        fun settle(wanted: Set<String>, nowRunning: Set<String>) {
            running = nowRunning
            val dropped = wanted - nowRunning
            if (dropped.isEmpty()) return
            current = current - dropped
            dropped.forEach { refused.tryEmit(it) }
        }
    }

    companion object {
        private const val TAG = "CzenForeground"
        const val NOTIFICATION_ID = 4471
        const val CHANNEL_ID = "czen-driver"

        fun ensureChannel(context: Context) {
            val nm = context.getSystemService(NotificationManager::class.java)
            if (nm.getNotificationChannel(CHANNEL_ID) == null) {
                nm.createNotificationChannel(
                    NotificationChannel(CHANNEL_ID, context.getString(R.string.fg_channel_name), NotificationManager.IMPORTANCE_LOW).apply {
                        description = context.getString(R.string.fg_channel_desc)
                    },
                )
            }
        }
    }
}

/**
 * The `foregroundServiceType` for a set of reasons. Android 10 (API 29) has no microphone type:
 * a call or the wake word starts with the manifest default there, which is not a failure.
 */
@SuppressLint("InlinedApi") // FOREGROUND_SERVICE_TYPE_MICROPHONE is only used from API 30 (sdk check below)
internal fun foregroundTypeFor(reasons: Set<String>, sdk: Int): Int {
    val mic = CzenForegroundService.Reasons.CALL in reasons || CzenForegroundService.Reasons.WAKE in reasons
    if (mic && sdk < Build.VERSION_CODES.R) return ServiceInfo.FOREGROUND_SERVICE_TYPE_MANIFEST
    var type = 0
    if (mic) type = type or ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE
    if (CzenForegroundService.Reasons.LOCATION in reasons) type = type or ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION
    return type
}

/**
 * The type for the "start, then stop at once" fallback. Type 0 is rejected on API 34+ for this
 * targetSdk; `shortService` (declared in the manifest) needs no permission and no runtime state.
 */
@SuppressLint("InlinedApi") // FOREGROUND_SERVICE_TYPE_SHORT_SERVICE is only used from API 34 (sdk check)
internal fun fallbackForegroundType(sdk: Int): Int =
    if (sdk >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) ServiceInfo.FOREGROUND_SERVICE_TYPE_SHORT_SERVICE else 0

internal object ForegroundStart {
    /**
     * Tries [start] with every wanted reason and returns the reasons the service is in the
     * foreground for afterwards. A refused start does not take the service out of the
     * foreground: the wanted reasons that were already [running] keep running (the second
     * [start] only refreshes the notification, best effort). Empty — stop the service — only
     * when none of the wanted reasons was running.
     */
    fun negotiate(wanted: Set<String>, running: Set<String>, start: (Set<String>) -> Boolean): Set<String> {
        if (wanted.isEmpty()) return emptySet()
        if (start(wanted)) return wanted
        val kept = wanted intersect running
        if (kept.isNotEmpty() && kept != wanted) start(kept)
        return kept
    }
}

/**
 * Adds/removes reasons and (re)starts or stops [CzenForegroundService]. When the OS refuses the
 * start (e.g. `ForegroundServiceStartNotAllowedException` from the background) the added reason
 * is rolled back, so [CzenForegroundService.Reasons] never claims a service that is not running.
 */
@SuppressLint("LogNotTimber")
@Singleton
class ServiceForegroundController internal constructor(
    private val start: () -> Unit,
    private val stop: () -> Unit,
) : ForegroundController {
    @Inject
    constructor(@ApplicationContext context: Context) : this(
        start = { ContextCompat.startForegroundService(context, Intent(context, CzenForegroundService::class.java)) },
        stop = { context.stopService(Intent(context, CzenForegroundService::class.java)) },
    )

    override val refused: Flow<String> = CzenForegroundService.Reasons.refused.asSharedFlow()

    /** @return false when a reason was to be added and the OS refused the start. */
    @Synchronized
    private fun update(add: String? = null, remove: String? = null): Boolean {
        val prev = CzenForegroundService.Reasons.current
        // Already held (hands-free keeps "wake" across a call): the service runs for it.
        if (add != null && add in prev) return true
        if (remove != null && remove !in prev) return true
        val next = prev.toMutableSet()
        add?.let { next += it }
        remove?.let { next -= it }
        CzenForegroundService.Reasons.current = next
        if (next.isEmpty()) {
            CzenForegroundService.Reasons.running = emptySet()
            stop()
            return true
        }
        return try {
            start()
            true
        } catch (e: Exception) {
            // Roll back only what this call added; reasons already running stay, and a
            // removed reason stays removed (its owner no longer needs the service).
            CzenForegroundService.Reasons.current = next - setOfNotNull(add)
            Log.w(TAG, "foreground service start refused (${add ?: remove}): ${e.javaClass.simpleName}")
            add == null
        }
    }

    override fun startCall() = update(add = CzenForegroundService.Reasons.CALL)
    override fun stopCall() { update(remove = CzenForegroundService.Reasons.CALL) }
    override fun startWakeWord() = update(add = CzenForegroundService.Reasons.WAKE)
    override fun stopWakeWord() { update(remove = CzenForegroundService.Reasons.WAKE) }
    fun startLocation() = update(add = CzenForegroundService.Reasons.LOCATION)
    fun stopLocation() { update(remove = CzenForegroundService.Reasons.LOCATION) }

    private companion object {
        const val TAG = "CzenForeground"
    }
}
