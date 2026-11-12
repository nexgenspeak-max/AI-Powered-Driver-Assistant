package com.chinhtruongba.driverapp.feature.voice

import com.chinhtruongba.driverapp.core.data.ApplicationScope
import com.chinhtruongba.driverapp.core.data.DriverRepository
import com.chinhtruongba.driverapp.core.storage.PrefsStore
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.booleanOrNull
import kotlinx.serialization.json.buildJsonArray
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.put
import javax.inject.Inject
import javax.inject.Singleton

/** A transcript/chat message surfaced to the UI (subscribeVoiceMessages). */
data class VoiceMessage(val text: String, val from: VoiceSource, val isFinal: Boolean, val segmentId: String?)

/** Pure filters from voiceSessionStore.ts, exposed for tests. */
object VoiceFilters {
    private val toolToken = Regex("^[a-z][a-z0-9_]+$")
    private val spaces = Regex("\\s+")
    private val trailing = Regex("[.!?…]+$")

    /** The LLM sometimes speaks a bare tool id — hide it from chat bubbles. */
    fun isRawToolToken(text: String): Boolean {
        val t = text.trim()
        if (t.isEmpty() || t.any { it.isWhitespace() }) return false
        return toolToken.matches(t) && t.contains('_')
    }

    fun dedupKey(from: VoiceSource, text: String): String =
        "${from.name}:${text.trim().replace(spaces, " ").replace(trailing, "").lowercase()}"

    /** Who said it: local → user; `customer-*` while a call is active → customer; else agent. */
    fun sourceOf(isLocal: Boolean, identity: String, callActive: Boolean): VoiceSource = when {
        isLocal -> VoiceSource.User
        callActive && identity.startsWith("customer-", ignoreCase = true) -> VoiceSource.Customer
        else -> VoiceSource.Agent
    }
}

/** Drops a final message whose normalized text repeats within 3 s. */
class FinalDeduper(private val windowMs: Long = 3_000L) {
    private val recent = HashMap<String, Long>()

    fun accept(key: String, now: Long): Boolean {
        val prev = recent[key]
        if (prev != null && now - prev < windowMs) return false
        recent[key] = now
        recent.entries.removeAll { now - it.value >= windowMs }
        return true
    }
}

/**
 * The Czen voice session (voiceSessionStore.ts): token → LiveKit room with mic, transcripts,
 * call/agent state, cancel-call control, bridge transcripts, contacts RPC, watchdog, teardown.
 */
@Singleton
class VoiceSession @Inject constructor(
    private val engine: VoiceEngine,
    private val driverRepo: DriverRepository,
    private val prefs: PrefsStore,
    private val filler: FillerAudio,
    private val foreground: ForegroundController,
    private val contacts: ContactsSource,
    private val chat: ChatStore,
    @param:ApplicationScope private val scope: CoroutineScope,
) {
    private val json = Json { ignoreUnknownKeys = true }
    private val _state = MutableStateFlow(VoiceState())
    val state: StateFlow<VoiceState> = _state.asStateFlow()

    private val _messages = MutableSharedFlow<VoiceMessage>(extraBufferCapacity = 64)
    val messages: SharedFlow<VoiceMessage> = _messages.asSharedFlow()

    /** Emits once when a user hang-up finished: close the chat panel and route home. */
    private val _returnHome = MutableSharedFlow<Unit>(extraBufferCapacity = 1)
    val returnHome: SharedFlow<Unit> = _returnHome.asSharedFlow()

    private var connecting = false
    private var connectJob: Job? = null
    private var watchdog: Job? = null
    private var pendingUserDisconnectFiller = false
    private var pendingClosePanelOnIdle = false
    private var roomGeneration = 0

    init {
        // useCaptureVoiceMessages: mirror transcripts into the chat bubbles.
        scope.launch {
            messages.collect { m ->
                val who = when (m.from) {
                    VoiceSource.User -> Speaker.Me
                    VoiceSource.Agent -> Speaker.Bot
                    VoiceSource.Customer -> Speaker.Customer
                }
                chat.upsertStreaming(who, m.text, m.isFinal, m.segmentId)
            }
        }
    }

    fun connect(driverPhone: String) {
        if (connecting) return // synchronous re-entrancy guard
        connecting = true
        connectJob = scope.launch {
            try {
                connectLocked(driverPhone)
            } finally {
                connecting = false
            }
        }
    }

    private suspend fun connectLocked(phone: String) {
        if (engine.isActive) return
        val generation = ++roomGeneration
        _state.value = VoiceState(status = VoiceStatus.Connecting)
        filler.stopConnecting()
        try {
            delay(350) // let the wake-word recogniser release the mic
            val lang = prefs.voiceLangNow().routing
            val token = coroutineScope {
                val t = async { driverRepo.voiceToken(phone, lang) }
                val f = async { filler.playConnecting() }
                f.await()
                t.await()
            }
            filler.handoffConnecting()
            delay(160)
            retryAudioSession()
            engine.connect(token.livekitUrl, token.token, listener(generation))
            var micOk = engine.setMicrophoneEnabled(true)
            if (!micOk) {
                engine.setMicrophoneEnabled(false)
                delay(200)
                micOk = engine.setMicrophoneEnabled(true)
            }
            foreground.startCall()
            _state.update { it.copy(status = VoiceStatus.Connected, isMicMuted = false) }
            startWatchdog(generation)
        } catch (e: CancellationException) {
            cleanupAfterFailure(cancelled = true)
            throw e
        } catch (_: Exception) {
            cleanupAfterFailure(cancelled = false)
        }
    }

    private suspend fun retryAudioSession() {
        val backoffs = longArrayOf(0, 400, 900)
        var last: Exception? = null
        for (b in backoffs) {
            if (b > 0) delay(b)
            try {
                engine.startAudioSession()
                return
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                last = e
            }
        }
        throw last ?: IllegalStateException("audio session")
    }

    private suspend fun cleanupAfterFailure(cancelled: Boolean) {
        watchdog?.cancel()
        runCatching { engine.disconnect() }
        runCatching { engine.stopAudioSession() }
        foreground.stopCall()
        filler.stopConnecting()
        filler.stopDisconnecting()
        _state.value = VoiceState(status = if (cancelled) VoiceStatus.Idle else VoiceStatus.Error)
    }

    private fun startWatchdog(generation: Int) {
        watchdog?.cancel()
        watchdog = scope.launch {
            while (isActive) {
                delay(4_000)
                if (generation != roomGeneration) return@launch
                if (engine.isDisconnected) {
                    handleDisconnected(generation)
                    return@launch
                }
            }
        }
    }

    private fun listener(generation: Int) = object : VoiceEngineListener {
        private val deduper = FinalDeduper()

        override fun onDisconnected() {
            scope.launch { handleDisconnected(generation) }
        }

        override fun onData(topic: String?, payload: ByteArray) {
            val obj = runCatching { json.parseToJsonElement(payload.decodeToString()).jsonObject }.getOrNull() ?: return
            val type = obj["type"]?.jsonPrimitive?.content
            when {
                topic == VoiceTopics.CALL_STATE && type == "call_state" -> {
                    val active = obj["active"]?.jsonPrimitive?.booleanOrNull == true
                    val mode = obj["mode"]?.jsonPrimitive?.content
                    _state.update { it.copy(isCallActive = active, callMode = if (active && (mode == "agent" || mode == "bridge")) mode else "") }
                }
                topic == VoiceTopics.AGENT_STATE && type == "agent_state" -> {
                    val s = obj["state"]?.jsonPrimitive?.content
                    _state.update { it.copy(agentSpeaking = s == "speaking" || s == "thinking") }
                }
            }
        }

        override fun onAgentLevel(level: Float) {
            _state.update { it.copy(agentAudioLevel = level.coerceIn(0f, 1f)) }
        }

        override fun onText(identity: String, isLocal: Boolean, topic: String, segmentId: String?, text: String, isFinal: Boolean) {
            if (text.isBlank()) return
            val from = VoiceFilters.sourceOf(isLocal, identity, _state.value.isCallActive)
            if (from == VoiceSource.Agent && VoiceFilters.isRawToolToken(text)) return
            if (isFinal) {
                if (!deduper.accept(VoiceFilters.dedupKey(from, text), System.currentTimeMillis())) return
                if (_state.value.callMode == "bridge" && from == VoiceSource.Customer) {
                    val body = buildJsonObject {
                        put("speaker", "customer")
                        put("text", text.trim())
                    }.toString().encodeToByteArray()
                    scope.launch { runCatching { engine.publishData(VoiceTopics.CALL_TRANSCRIPT, body) } }
                }
            }
            _messages.tryEmit(VoiceMessage(text, from, isFinal, segmentId))
        }

        override suspend fun onRpc(method: String, payload: String): String {
            if (method != VoiceTopics.RPC_SEARCH_CONTACTS) return buildJsonObject { put("error", "unknown_method") }.toString()
            return try {
                val query = json.parseToJsonElement(payload).jsonObject["query"]?.jsonPrimitive?.content.orEmpty()
                val matches = contacts.search(query)
                buildJsonObject {
                    put(
                        "matches",
                        buildJsonArray {
                            matches.forEach { m ->
                                add(
                                    buildJsonObject {
                                        put("name", m.name)
                                        put("phone_number", m.phoneNumber)
                                    },
                                )
                            }
                        },
                    )
                }.toString()
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                buildJsonObject { put("error", e.message ?: e.toString()) }.toString()
            }
        }
    }

    private suspend fun handleDisconnected(generation: Int) {
        if (generation != roomGeneration) return
        roomGeneration++
        watchdog?.cancel()
        runCatching { engine.stopAudioSession() }
        foreground.stopCall()
        filler.stopConnecting()
        _state.value = VoiceState()
        if (pendingUserDisconnectFiller) {
            pendingUserDisconnectFiller = false
            try {
                filler.playDisconnecting()
            } finally {
                filler.stopDisconnecting()
            }
        } else {
            filler.stopDisconnecting()
        }
        if (pendingClosePanelOnIdle) {
            pendingClosePanelOnIdle = false
            chat.closePanel()
            _returnHome.tryEmit(Unit)
        }
    }

    /** Hang up. A user hang-up plays the disconnect cue, closes the panel and returns home. */
    fun disconnect(userInitiated: Boolean = false) {
        scope.launch {
            val st = _state.value.status
            val userHangup = userInitiated && (st == VoiceStatus.Connected || st == VoiceStatus.Connecting)
            pendingUserDisconnectFiller = userHangup
            pendingClosePanelOnIdle = userHangup
            filler.stopConnecting()
            if (st == VoiceStatus.Connecting) {
                connectJob?.cancel()
                if (userHangup) {
                    pendingUserDisconnectFiller = false
                    pendingClosePanelOnIdle = false
                    chat.closePanel()
                    _returnHome.tryEmit(Unit)
                }
                return@launch
            }
            val generation = roomGeneration
            runCatching { engine.disconnect() }
            // Some transports report the close asynchronously; make teardown deterministic.
            handleDisconnected(generation)
        }
    }

    suspend fun setMicMuted(muted: Boolean) {
        if (_state.value.status != VoiceStatus.Connected) return
        try {
            engine.setMicrophoneEnabled(!muted)
            _state.update { it.copy(isMicMuted = muted) }
        } catch (e: CancellationException) {
            throw e
        } catch (_: Exception) {
            // keep the previous mute state
        }
    }

    suspend fun sendText(text: String): Boolean {
        if (_state.value.status != VoiceStatus.Connected) return false
        engine.sendText(text, VoiceTopics.CHAT)
        return true
    }

    /** Ask the agent to hang up the customer call (`call_control` `{"action":"cancel"}`). */
    suspend fun cancelCall(): Boolean {
        if (_state.value.status != VoiceStatus.Connected) return false
        engine.publishData(VoiceTopics.CALL_CONTROL, buildJsonObject { put("action", "cancel") }.toString().encodeToByteArray())
        return true
    }

    /** Wait until the session is idle (used by the wake word to resume). */
    suspend fun awaitIdle() {
        state.first { it.status == VoiceStatus.Idle || it.status == VoiceStatus.Error }
    }
}
