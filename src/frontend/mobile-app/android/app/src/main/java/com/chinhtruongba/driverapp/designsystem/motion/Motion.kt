package com.chinhtruongba.driverapp.designsystem.motion

import android.database.ContentObserver
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import androidx.compose.animation.EnterTransition
import androidx.compose.animation.ExitTransition
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.platform.LocalContext

/** System "Remove animations" sets the animator duration scale to 0: treat that as reduce motion. */
fun isReduceMotion(animatorDurationScale: Float): Boolean = animatorDurationScale == 0f

/**
 * True while the system animator duration scale is 0 (Settings → Accessibility → Remove
 * animations). Observed live, so toggling the setting updates the UI without a restart.
 */
@Composable
fun rememberReduceMotion(): Boolean {
    val resolver = LocalContext.current.contentResolver
    fun read() = runCatching {
        isReduceMotion(Settings.Global.getFloat(resolver, Settings.Global.ANIMATOR_DURATION_SCALE, 1f))
    }.getOrDefault(false)
    var reduce by remember { mutableStateOf(read()) }
    DisposableEffect(resolver) {
        val observer = object : ContentObserver(Handler(Looper.getMainLooper())) {
            override fun onChange(selfChange: Boolean) {
                reduce = read()
            }
        }
        runCatching {
            resolver.registerContentObserver(Settings.Global.getUriFor(Settings.Global.ANIMATOR_DURATION_SCALE), false, observer)
        }
        onDispose { resolver.unregisterContentObserver(observer) }
    }
    return reduce
}

/** [enter] unless reduce motion is on, in which case content appears without animation. */
fun EnterTransition.unless(reduceMotion: Boolean): EnterTransition = if (reduceMotion) EnterTransition.None else this

/** [exit] unless reduce motion is on, in which case content disappears without animation. */
fun ExitTransition.unless(reduceMotion: Boolean): ExitTransition = if (reduceMotion) ExitTransition.None else this
