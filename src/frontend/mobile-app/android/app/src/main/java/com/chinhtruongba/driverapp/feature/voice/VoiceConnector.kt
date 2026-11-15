package com.chinhtruongba.driverapp.feature.voice

import android.Manifest
import com.chinhtruongba.driverapp.app.PermissionGateway
import com.chinhtruongba.driverapp.core.data.SessionRepository
import javax.inject.Inject
import javax.inject.Singleton

/**
 * The one entry point for opening a voice session (orb, composer, nudge auto-connect, wake
 * word, deep link). Like the RN store's `connect`, it asks for the microphone on each connect
 * (parity-map §6): denied → [VoiceStatus.Error] instead of a room the driver cannot speak in.
 *
 * With no visible activity the request waits for one, but it is not a promise to connect later:
 * at most one connect waits, and when the prompt can finally be shown (and again when it is
 * answered) the connect must still make sense — same driver signed in, session idle, and
 * whatever the caller's [connect] `stillWanted` says (e.g. the nudge is still pending).
 */
@Singleton
class VoiceConnector @Inject constructor(
    private val voice: VoiceSession,
    private val permissions: PermissionGateway,
    private val session: SessionRepository,
) {
    private class Request(val phone: String, val stillWanted: () -> Boolean, val onDropped: () -> Unit)

    /**
     * The connect waiting for the microphone answer; a newer connect replaces it. Only the first
     * answer that arrives connects, so several prompts in a row never open several sessions.
     */
    private var pending: Request? = null

    /**
     * @param stillWanted checked before the microphone prompt and before connecting.
     * @param onDropped called when the connect was given up because it went stale.
     */
    fun connect(driverPhone: String, stillWanted: () -> Boolean = { true }, onDropped: () -> Unit = { }) {
        pending = Request(driverPhone, stillWanted, onDropped)
        // The call runs under the foreground service: make sure its notification can be shown.
        permissions.requestNotifications()
        permissions.request(
            permissions = arrayOf(Manifest.permission.RECORD_AUDIO),
            key = "voice-connect",
            stillWanted = { pending?.let(::valid) == true },
            onDropped = { take()?.onDropped?.invoke() },
        ) { result ->
            val request = take() ?: return@request
            if (valid(request)) {
                voice.connect(request.phone, micGranted = result[Manifest.permission.RECORD_AUDIO] == true)
            } else {
                request.onDropped()
            }
        }
    }

    private fun take(): Request? = pending.also { pending = null }

    private fun valid(request: Request): Boolean {
        val status = voice.state.value.status
        return session.currentPhone() == request.phone &&
            (status == VoiceStatus.Idle || status == VoiceStatus.Error) &&
            request.stillWanted()
    }
}
