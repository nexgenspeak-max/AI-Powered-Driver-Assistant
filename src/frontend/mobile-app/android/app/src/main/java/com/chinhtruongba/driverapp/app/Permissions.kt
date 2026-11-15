package com.chinhtruongba.driverapp.app

import android.Manifest
import android.annotation.SuppressLint
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.core.content.ContextCompat
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import com.chinhtruongba.driverapp.R
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton

/** Something that can ask for runtime permissions and report each one's state afterwards. */
interface PermissionAsker {
    /**
     * Asks for [permissions] (unless all are granted) and calls [onResult] with each one's
     * state afterwards. Concurrent calls are served one system dialog at a time, each with its
     * own callback.
     */
    fun requestEach(permissions: Array<String>, onResult: (Map<String, Boolean>) -> Unit)
}

/**
 * FIFO of permission requests over a single `RequestMultiplePermissions` launcher. The launcher
 * can show one dialog at a time and returns one result, so a request that arrives while
 * another is showing (e.g. the agent's contacts lookup during the go-online location chain)
 * waits its turn instead of overwriting the earlier caller's callback.
 */
class PermissionQueue(
    private var launch: (Array<String>) -> Unit,
    private val isGranted: (String) -> Boolean,
) : PermissionAsker {
    private class Pending(val permissions: Array<String>, val onResult: (Map<String, Boolean>) -> Unit)

    private val queue = ArrayDeque<Pending>()
    private var inFlight: Pending? = null

    /**
     * Points the queue at the launcher of a recreated activity. The request in flight is not
     * launched again: the system re-delivers its result to the new launcher, and [onResult]
     * answers the original caller and moves on to the requests still waiting.
     */
    fun attach(launch: (Array<String>) -> Unit) {
        this.launch = launch
    }

    override fun requestEach(permissions: Array<String>, onResult: (Map<String, Boolean>) -> Unit) {
        if (permissions.all(isGranted)) {
            onResult(permissions.associateWith { true })
            return
        }
        queue.addLast(Pending(permissions, onResult))
        pump()
    }

    /** Short alias used by tests and callers that want the per-permission map. */
    fun request(permissions: Array<String>, onResult: (Map<String, Boolean>) -> Unit) = requestEach(permissions, onResult)

    /** The launcher's result for the request in flight. */
    fun onResult(result: Map<String, Boolean>) {
        val done = inFlight ?: return
        inFlight = null
        done.onResult(done.permissions.associateWith { result[it] == true || isGranted(it) })
        pump()
    }

    private fun pump() {
        if (inFlight != null) return
        while (queue.isNotEmpty()) {
            val next = queue.removeFirst()
            // Granted meanwhile (e.g. by the request ahead of it): answer without a dialog.
            if (next.permissions.all(isGranted)) {
                next.onResult(next.permissions.associateWith { true })
                continue
            }
            inFlight = next
            launch(next.permissions)
            return
        }
    }
}

/**
 * Lets code without an activity (coordinators, the voice connector, deep links) ask for a
 * runtime permission. Requests go to the visible activity's [PermissionAsker]; while there is
 * none they wait and are asked as soon as an activity is started again.
 */
@Singleton
class PermissionGateway internal constructor(
    private val isGranted: (String) -> Boolean,
    private val sdk: Int,
) : PermissionAsker {
    @Inject
    constructor(@ApplicationContext context: Context) : this({ context.hasPermission(it) }, Build.VERSION.SDK_INT)

    private class Waiting(
        val key: String?,
        val permissions: Array<String>,
        val stillWanted: () -> Boolean,
        val onDropped: () -> Unit,
        val onResult: (Map<String, Boolean>) -> Unit,
    )

    private var asker: PermissionAsker? = null
    private val waiting = ArrayDeque<Waiting>()
    private var notificationsAsked = false

    /** Whether an activity is started, i.e. a system permission dialog can be shown now. */
    val hasVisibleActivity: Boolean get() = asker != null

    /**
     * Activity `onStart`: requests that waited for a visible activity are asked now, unless
     * what they were for is gone meanwhile (no prompt without context).
     */
    fun attach(asker: PermissionAsker) {
        this.asker = asker
        while (waiting.isNotEmpty()) {
            val next = waiting.removeFirst()
            if (next.stillWanted()) request(next.permissions, next.key, next.stillWanted, next.onDropped, next.onResult) else next.onDropped()
        }
    }

    /** Activity `onStop`. */
    fun detach(asker: PermissionAsker) {
        if (this.asker === asker) this.asker = null
    }

    override fun requestEach(permissions: Array<String>, onResult: (Map<String, Boolean>) -> Unit) =
        request(permissions, onResult = onResult)

    /**
     * [requestEach] for a request that can go stale while it waits for an activity: when one
     * starts and [stillWanted] is false, nothing is asked and [onDropped] is called instead.
     * At most one request per [key] waits; a newer one replaces it.
     */
    fun request(
        permissions: Array<String>,
        key: String? = null,
        stillWanted: () -> Boolean = { true },
        onDropped: () -> Unit = { },
        onResult: (Map<String, Boolean>) -> Unit,
    ) {
        if (permissions.all(isGranted)) {
            onResult(permissions.associateWith { true })
            return
        }
        val current = asker
        if (current != null) {
            current.requestEach(permissions, onResult)
        } else {
            if (key != null) waiting.removeAll { it.key == key }
            waiting.addLast(Waiting(key, permissions, stillWanted, onDropped, onResult))
        }
    }

    /**
     * Android 13+ hides the foreground-service notification without POST_NOTIFICATIONS. Asked
     * once per process, before the first foreground-service start (going online, first connect,
     * enabling hands-free). Nobody waits for the answer: a denial never blocks the action.
     */
    fun requestNotifications() {
        if (sdk < Build.VERSION_CODES.TIRAMISU || notificationsAsked) return
        notificationsAsked = true
        @SuppressLint("InlinedApi") // guarded by the injected sdk level above
        val permission = Manifest.permission.POST_NOTIFICATIONS
        requestEach(arrayOf(permission)) { }
    }
}

/** Keeps the [PermissionQueue] across activity recreation. */
class PermissionQueueHolder : ViewModel() {
    var queue: PermissionQueue? = null
}

/**
 * Runtime permissions asked in context (mic on connect, location when going online, contacts
 * lazily). Registered by [ComponentActivity] before it is started.
 */
class PermissionRequester(
    private val activity: ComponentActivity,
    /** Observes every permission result (before the caller's callback), e.g. to start location. */
    private val onAnyResult: (Map<String, Boolean>) -> Unit = {},
) : PermissionAsker {
    private val queue: PermissionQueue
    private val launcher = activity.registerForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { res ->
        onAnyResult(res)
        queue.onResult(res)
    }

    init {
        // The queue outlives a configuration change (rotation, dark mode, font scale) in the
        // activity's ViewModelStore, so a dialog that was showing still answers its caller and
        // the requests behind it are not dropped. It holds the application context only.
        val holder = ViewModelProvider(activity)[PermissionQueueHolder::class.java]
        val appContext = activity.applicationContext
        queue = holder.queue?.also { it.attach { p -> launcher.launch(p) } }
            ?: PermissionQueue(launch = { launcher.launch(it) }, isGranted = { appContext.hasPermission(it) })
                .also { holder.queue = it }
    }

    fun granted(permission: String): Boolean =
        ContextCompat.checkSelfPermission(activity, permission) == PackageManager.PERMISSION_GRANTED

    override fun requestEach(permissions: Array<String>, onResult: (Map<String, Boolean>) -> Unit) =
        queue.requestEach(permissions, onResult)

    /** Calls [onResult] with true when every permission in [permissions] is granted. */
    fun request(permissions: Array<String>, onResult: (Boolean) -> Unit) =
        requestEach(permissions) { res -> onResult(res.values.all { it }) }

    /** [PermissionAsker.requestLocationForOnline], telling the driver when only approximate location was allowed. */
    fun requestLocationForOnline(onDone: (LocationGrant) -> Unit) {
        locationChain(this) { grant ->
            if (grant.approximate) Toast.makeText(activity, R.string.location_approximate_note, Toast.LENGTH_LONG).show()
            onDone(grant)
        }
    }
}

/** What the go-online location chain ended with. */
data class LocationGrant(val foreground: Boolean, val approximate: Boolean, val background: Boolean) {
    companion object {
        /**
         * Android 12+ lets the driver pick "Approximate": COARSE granted, FINE denied. That is
         * still a foreground grant (the live push works, just less precise).
         */
        fun from(result: Map<String, Boolean>): LocationGrant {
            val fine = result[Manifest.permission.ACCESS_FINE_LOCATION] == true
            val coarse = result[Manifest.permission.ACCESS_COARSE_LOCATION] == true
            return LocationGrant(foreground = fine || coarse, approximate = coarse && !fine, background = false)
        }
    }
}

val LocalPermissions = staticCompositionLocalOf<PermissionRequester?> { null }

fun Context.hasPermission(p: String) = ContextCompat.checkSelfPermission(this, p) == PackageManager.PERMISSION_GRANTED

/**
 * Going online asks for location: foreground first, then background (parity-map §6). An
 * approximate-only grant proceeds to the background request instead of skipping it.
 */
fun PermissionAsker.requestLocationForOnline(onDone: (LocationGrant) -> Unit) = locationChain(this, onDone)

private fun locationChain(asker: PermissionAsker, onDone: (LocationGrant) -> Unit) = with(asker) {
    requestEach(arrayOf(Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION)) { res ->
        val fg = LocationGrant.from(res)
        if (fg.foreground) {
            requestEach(arrayOf(Manifest.permission.ACCESS_BACKGROUND_LOCATION)) { bg ->
                onDone(fg.copy(background = bg[Manifest.permission.ACCESS_BACKGROUND_LOCATION] == true))
            }
        } else {
            onDone(fg)
        }
    }
}
