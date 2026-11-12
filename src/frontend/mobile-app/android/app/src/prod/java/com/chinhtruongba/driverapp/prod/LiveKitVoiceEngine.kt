package com.chinhtruongba.driverapp.prod

import android.content.Context
import android.media.AudioManager
import com.chinhtruongba.driverapp.feature.voice.VoiceEngine
import com.chinhtruongba.driverapp.feature.voice.VoiceEngineListener
import com.chinhtruongba.driverapp.feature.voice.VoiceTopics
import dagger.hilt.android.qualifiers.ApplicationContext
import io.livekit.android.LiveKit
import io.livekit.android.audio.AudioSwitchHandler
import io.livekit.android.events.RoomEvent
import io.livekit.android.events.collect
import io.livekit.android.room.Room
import io.livekit.android.room.datastream.StreamTextOptions
import io.livekit.android.room.datastream.incoming.TextStreamReceiver
import io.livekit.android.room.participant.Participant
import io.livekit.android.room.track.DataPublishReliability
import io.livekit.android.room.track.Track
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import javax.inject.Inject
import javax.inject.Singleton

/**
 * LiveKit Android SDK transport for the Czen voice agent: same topics, RPC and data formats as
 * the RN client (voiceSessionStore.ts). One [Room] per session; [VoiceSession] owns the state.
 */
@Singleton
class LiveKitVoiceEngine @Inject constructor(
    @param:ApplicationContext private val context: Context,
) : VoiceEngine {
    private var room: Room? = null
    private var scope: CoroutineScope? = null

    override val isActive: Boolean
        get() = room?.state.let { it == Room.State.CONNECTED || it == Room.State.CONNECTING || it == Room.State.RECONNECTING }

    override val isDisconnected: Boolean
        get() = room?.state == Room.State.DISCONNECTED

    /** Creates the room with a communication audio session that ducks other audio. */
    override suspend fun startAudioSession() {
        if (room != null) return
        val r = LiveKit.create(context)
        (r.audioHandler as? AudioSwitchHandler)?.apply {
            audioMode = AudioManager.MODE_IN_COMMUNICATION
            focusMode = AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK
            audioStreamType = AudioManager.STREAM_VOICE_CALL
        }
        room = r
    }

    override suspend fun stopAudioSession() {
        val r = room ?: return
        room = null
        scope?.cancel()
        scope = null
        runCatching { r.disconnect() }
        runCatching { r.release() }
    }

    override suspend fun connect(url: String, token: String, listener: VoiceEngineListener) {
        if (room == null) startAudioSession()
        val r = room ?: error("room not created")
        val s = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)
        scope = s

        s.launch {
            r.events.collect { e ->
                when (e) {
                    is RoomEvent.Disconnected -> listener.onDisconnected()
                    is RoomEvent.DataReceived -> listener.onData(e.topic, e.data)
                    is RoomEvent.ActiveSpeakersChanged -> {
                        val local = r.localParticipant.identity
                        val agent = e.speakers.firstOrNull { it.identity != local }
                        listener.onAgentLevel(agent?.audioLevel ?: 0f)
                    }
                    else -> Unit
                }
            }
        }

        val handler = { reader: TextStreamReceiver, from: Participant.Identity ->
            s.launch { handleStream(r, reader, from, listener) }
            Unit
        }
        runCatching { r.registerTextStreamHandler(VoiceTopics.TRANSCRIPTION, handler) }
        runCatching { r.registerTextStreamHandler(VoiceTopics.CHAT, handler) }
        r.registerRpcMethod(VoiceTopics.RPC_SEARCH_CONTACTS) { data -> listener.onRpc(VoiceTopics.RPC_SEARCH_CONTACTS, data.payload) }

        r.connect(url, token)
    }

    private suspend fun handleStream(r: Room, reader: TextStreamReceiver, from: Participant.Identity, listener: VoiceEngineListener) {
        val identity = from.value
        val isLocal = identity == r.localParticipant.identity?.value
        val topic = reader.info.topic
        val segmentId = reader.info.attributes[VoiceTopics.ATTR_SEGMENT]
        try {
            if (topic != VoiceTopics.TRANSCRIPTION) {
                listener.onText(identity, isLocal, topic, segmentId, reader.readAll().joinToString(""), true)
                return
            }
            val sb = StringBuilder()
            reader.flow.collect { chunk ->
                sb.append(chunk)
                listener.onText(identity, isLocal, topic, segmentId, sb.toString(), false)
            }
            val final = reader.info.attributes[VoiceTopics.ATTR_FINAL] != "false"
            listener.onText(identity, isLocal, topic, segmentId, sb.toString(), final)
        } catch (e: CancellationException) {
            throw e
        } catch (_: Exception) {
            // A broken stream only loses that bubble.
        }
    }

    override suspend fun disconnect() {
        room?.disconnect()
    }

    override suspend fun setMicrophoneEnabled(enabled: Boolean): Boolean {
        val lp = room?.localParticipant ?: return false
        lp.setMicrophoneEnabled(enabled)
        val pub = lp.getTrackPublication(Track.Source.MICROPHONE)
        return pub != null && !pub.muted
    }

    override suspend fun sendText(text: String, topic: String) {
        room?.localParticipant?.sendText(text, StreamTextOptions(topic = topic))
    }

    override suspend fun publishData(topic: String, payload: ByteArray) {
        room?.localParticipant?.publishData(payload, DataPublishReliability.RELIABLE, topic)
    }
}
