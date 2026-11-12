package com.chinhtruongba.driverapp.app

import android.content.Context
import android.content.pm.PackageManager
import androidx.activity.ComponentActivity
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.core.content.ContextCompat

/**
 * Runtime permissions asked in context (mic on connect, location when going online, contacts
 * lazily). Registered by [ComponentActivity] before it is started.
 */
class PermissionRequester(private val activity: ComponentActivity) {
    private var pending: ((Map<String, Boolean>) -> Unit)? = null
    private val launcher = activity.registerForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { res ->
        pending?.invoke(res)
        pending = null
    }

    fun granted(permission: String): Boolean =
        ContextCompat.checkSelfPermission(activity, permission) == PackageManager.PERMISSION_GRANTED

    /** Calls [onResult] with true when every permission in [permissions] is granted. */
    fun request(permissions: Array<String>, onResult: (Boolean) -> Unit) {
        if (permissions.all(::granted)) {
            onResult(true)
            return
        }
        pending = { res -> onResult(permissions.all { res[it] == true || granted(it) }) }
        launcher.launch(permissions)
    }
}

val LocalPermissions = staticCompositionLocalOf<PermissionRequester?> { null }

fun Context.hasPermission(p: String) = ContextCompat.checkSelfPermission(this, p) == PackageManager.PERMISSION_GRANTED

/** Going online asks for location: foreground first, then background (parity-map §6). */
fun PermissionRequester.requestLocationForOnline(onDone: () -> Unit) {
    request(arrayOf(android.Manifest.permission.ACCESS_FINE_LOCATION, android.Manifest.permission.ACCESS_COARSE_LOCATION)) { fg ->
        if (fg) {
            request(arrayOf(android.Manifest.permission.ACCESS_BACKGROUND_LOCATION)) { onDone() }
        } else {
            onDone()
        }
    }
}
