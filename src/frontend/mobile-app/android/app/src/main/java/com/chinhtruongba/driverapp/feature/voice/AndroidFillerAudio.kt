package com.chinhtruongba.driverapp.feature.voice

import android.content.Context
import android.media.AudioAttributes
import android.media.MediaPlayer
import com.chinhtruongba.driverapp.R
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.delay
import kotlinx.coroutines.withTimeoutOrNull
import javax.inject.Inject
import javax.inject.Singleton

/** Czen connect/disconnect cues and the new-trip alert (czenFillerAudio.ts). */
@Singleton
class AndroidFillerAudio @Inject constructor(@ApplicationContext private val context: Context) : FillerAudio {
    private var connecting: MediaPlayer? = null
    private var disconnecting: MediaPlayer? = null

    private fun create(res: Int, usage: Int = AudioAttributes.USAGE_ASSISTANT): MediaPlayer? =
        runCatching {
            MediaPlayer.create(
                context,
                res,
                AudioAttributes.Builder().setUsage(usage).setContentType(AudioAttributes.CONTENT_TYPE_SPEECH).build(),
                0,
            )
        }.getOrNull()

    override suspend fun playConnecting() {
        stopConnecting()
        val p = create(R.raw.connecting_czen) ?: return
        connecting = p
        p.setVolume(0f, 0f)
        p.start()
        // 300 ms fade-in.
        for (i in 1..6) {
            delay(50)
            if (connecting !== p) return
            val v = i / 6f
            runCatching { p.setVolume(v, v) }
        }
    }

    override suspend fun handoffConnecting() {
        val p = connecting ?: return
        for (i in 5 downTo 0) {
            if (connecting !== p) return
            val v = i / 6f
            runCatching { p.setVolume(v, v) }
            delay(40)
        }
        stopConnecting()
    }

    override fun stopConnecting() {
        connecting?.let { runCatching { it.stop() }; it.release() }
        connecting = null
    }

    override suspend fun playDisconnecting() {
        stopDisconnecting()
        val p = create(R.raw.disconnecting_czen) ?: return
        disconnecting = p
        val done = CompletableDeferred<Unit>()
        p.setOnCompletionListener { done.complete(Unit) }
        p.start()
        withTimeoutOrNull(4_000) { done.await() }
    }

    override fun stopDisconnecting() {
        disconnecting?.let { runCatching { it.stop() }; it.release() }
        disconnecting = null
    }

    override fun playNewTripAlert() {
        val p = create(R.raw.new_trip_alert, AudioAttributes.USAGE_NOTIFICATION_EVENT) ?: return
        p.setOnCompletionListener { it.release() }
        p.start()
    }
}
