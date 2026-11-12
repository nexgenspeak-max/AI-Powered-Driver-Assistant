package com.chinhtruongba.driverapp.core.util

import android.content.Context
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton

/** expo-haptics notification feedback: success, warning and error only. */
@Singleton
class Haptics @Inject constructor(@ApplicationContext private val context: Context) {
    private val vibrator: Vibrator?
        get() = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            context.getSystemService(VibratorManager::class.java)?.defaultVibrator
        } else {
            @Suppress("DEPRECATION")
            context.getSystemService(Vibrator::class.java)
        }

    private fun play(timings: LongArray, amps: IntArray) {
        runCatching { vibrator?.vibrate(VibrationEffect.createWaveform(timings, amps, -1)) }
    }

    fun success() = play(longArrayOf(0, 30, 60, 40), intArrayOf(0, 140, 0, 200))
    fun warning() = play(longArrayOf(0, 40, 80, 40), intArrayOf(0, 200, 0, 140))
    fun error() = play(longArrayOf(0, 40, 50, 40, 50, 60), intArrayOf(0, 220, 0, 220, 0, 255))
}
