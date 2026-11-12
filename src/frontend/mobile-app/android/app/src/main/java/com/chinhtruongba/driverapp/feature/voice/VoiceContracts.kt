package com.chinhtruongba.driverapp.feature.voice

/** Protocol constants shared with the voice agent (parity-map §3). */
object VoiceTopics {
    const val CALL_STATE = "call_state"
    const val AGENT_STATE = "agent_state"
    const val CALL_TRANSCRIPT = "call_transcript"
    const val CALL_CONTROL = "call_control"
    const val CHAT = "lk.chat"
    const val TRANSCRIPTION = "lk.transcription"
    const val ATTR_FINAL = "lk.transcription_final"
    const val ATTR_SEGMENT = "lk.segment_id"
    const val RPC_SEARCH_CONTACTS = "search_contacts"
}

enum class VoiceStatus { Idle, Connecting, Connected, Error }

data class VoiceState(
    val status: VoiceStatus = VoiceStatus.Idle,
    /** Smoothed 0..1 level of the agent's voice (ActiveSpeakersChanged). */
    val agentAudioLevel: Float = 0f,
    /** agent_state ∈ {speaking, thinking}. */
    val agentSpeaking: Boolean = false,
    /** A real SIP call is in progress (call_state.active). */
    val isCallActive: Boolean = false,
    /** "", "agent" or "bridge". */
    val callMode: String = "",
    val isMicMuted: Boolean = false,
)

enum class VoiceSource { User, Agent, Customer }

/** Callbacks from the transport (LiveKit room or the demo script). */
interface VoiceEngineListener {
    fun onDisconnected()
    fun onData(topic: String?, payload: ByteArray)

    /** Level of the first non-local active speaker, 0 when nobody speaks. */
    fun onAgentLevel(level: Float)

    /**
     * Cumulative text of a text stream. For `lk.transcription` this fires per chunk with
     * [isFinal] = false and once at the end; for `lk.chat` once with the whole message.
     */
    fun onText(identity: String, isLocal: Boolean, topic: String, segmentId: String?, text: String, isFinal: Boolean)

    /** `search_contacts` RPC: payload `{"query": "..."}` → JSON response string. */
    suspend fun onRpc(method: String, payload: String): String
}

/** The realtime transport. Prod: LiveKit Android SDK; demo: a scripted fake. */
interface VoiceEngine {
    /** True while the room is connected or connecting. */
    val isActive: Boolean

    /** True once the room reached the Disconnected state (watchdog). */
    val isDisconnected: Boolean

    suspend fun startAudioSession()
    suspend fun stopAudioSession()
    suspend fun connect(url: String, token: String, listener: VoiceEngineListener)
    suspend fun disconnect()

    /** Enables the mic; returns true when a live, unmuted mic publication exists. */
    suspend fun setMicrophoneEnabled(enabled: Boolean): Boolean
    suspend fun sendText(text: String, topic: String)
    suspend fun publishData(topic: String, payload: ByteArray)
}

/** Czen filler cues around connect/disconnect (czenFillerAudio.ts). */
interface FillerAudio {
    suspend fun playConnecting()
    suspend fun handoffConnecting()
    fun stopConnecting()
    suspend fun playDisconnecting()
    fun stopDisconnecting()
    fun playNewTripAlert()
}

/** Android foreground service id 4471 (channel "Czen Driver"). */
interface ForegroundController {
    fun startCall()

    /** Stops unless the wake word (hands-free) keeps the service alive. */
    fun stopCall()
    fun startWakeWord()
    fun stopWakeWord()
}

data class ContactMatch(val name: String, val phoneNumber: String)

class ContactsPermissionDenied : Exception("permission_denied")

interface ContactsSource {
    /** Max 5 matches, first number per contact; throws [ContactsPermissionDenied]. */
    suspend fun search(query: String): List<ContactMatch>
}
