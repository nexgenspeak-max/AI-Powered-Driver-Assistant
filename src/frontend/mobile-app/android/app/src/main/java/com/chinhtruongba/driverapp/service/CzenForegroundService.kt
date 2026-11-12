package com.chinhtruongba.driverapp.service

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import androidx.core.app.ServiceCompat
import androidx.core.content.ContextCompat
import com.chinhtruongba.driverapp.MainActivity
import com.chinhtruongba.driverapp.R
import com.chinhtruongba.driverapp.feature.voice.ForegroundController
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton

/**
 * The single foreground service (id 4471, channel "Czen Driver", types microphone|location):
 * live voice call, wake-word listening and background location share one notification. The
 * message follows the most important active reason.
 */
class CzenForegroundService : android.app.Service() {
    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val reasons = Reasons.current
        ensureChannel(this)
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
        val n: Notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_stat_czen)
            .setContentTitle(title)
            .setContentText(msg)
            .setOngoing(true)
            .setContentIntent(open)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .build()
        var type = 0
        if ((Reasons.CALL in reasons || Reasons.WAKE in reasons) && Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            type = type or ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE
        }
        if (Reasons.LOCATION in reasons) type = type or ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION
        // Always satisfy the startForegroundService() contract first, then stop if nothing is
        // left to do (or the OS refused the typed start, e.g. a missing runtime permission).
        val started = runCatching {
            ServiceCompat.startForeground(this, NOTIFICATION_ID, n, type)
        }.recoverCatching {
            ServiceCompat.startForeground(this, NOTIFICATION_ID, n, 0)
        }.isSuccess
        if (reasons.isEmpty() || !started || type == 0) {
            ServiceCompat.stopForeground(this, ServiceCompat.STOP_FOREGROUND_REMOVE)
            stopSelf()
        }
        return START_NOT_STICKY
    }

    object Reasons {
        const val CALL = "call"
        const val WAKE = "wake"
        const val LOCATION = "location"

        @Volatile
        var current: Set<String> = emptySet()
    }

    companion object {
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

/** Adds/removes reasons and (re)starts or stops [CzenForegroundService]. */
@Singleton
class ServiceForegroundController @Inject constructor(@ApplicationContext private val context: Context) : ForegroundController {
    private fun update(add: String? = null, remove: String? = null) {
        val next = CzenForegroundService.Reasons.current.toMutableSet()
        add?.let { next += it }
        remove?.let { next -= it }
        CzenForegroundService.Reasons.current = next
        val intent = Intent(context, CzenForegroundService::class.java)
        if (next.isEmpty()) {
            context.stopService(intent)
        } else {
            runCatching {
                ContextCompat.startForegroundService(context, intent)
            }
        }
    }

    override fun startCall() = update(add = CzenForegroundService.Reasons.CALL)
    override fun stopCall() = update(remove = CzenForegroundService.Reasons.CALL)
    override fun startWakeWord() = update(add = CzenForegroundService.Reasons.WAKE)
    override fun stopWakeWord() = update(remove = CzenForegroundService.Reasons.WAKE)
    fun startLocation() = update(add = CzenForegroundService.Reasons.LOCATION)
    fun stopLocation() = update(remove = CzenForegroundService.Reasons.LOCATION)
}
