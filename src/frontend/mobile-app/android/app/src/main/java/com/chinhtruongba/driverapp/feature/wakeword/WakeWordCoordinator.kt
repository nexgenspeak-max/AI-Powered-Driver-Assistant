package com.chinhtruongba.driverapp.feature.wakeword

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import androidx.core.content.ContextCompat
import com.chinhtruongba.driverapp.MainActivity
import com.chinhtruongba.driverapp.app.PermissionGateway
import com.chinhtruongba.driverapp.core.data.ApplicationScope
import com.chinhtruongba.driverapp.core.data.SessionRepository
import com.chinhtruongba.driverapp.core.storage.PrefsStore
import com.chinhtruongba.driverapp.feature.voice.ChatStore
import com.chinhtruongba.driverapp.feature.voice.ForegroundController
import com.chinhtruongba.driverapp.feature.voice.VoiceConnector
import com.chinhtruongba.driverapp.feature.voice.VoiceSession
import com.chinhtruongba.driverapp.feature.voice.VoiceStatus
import com.chinhtruongba.driverapp.service.CzenForegroundService
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.currentCoroutineContext
import kotlinx.coroutines.delay
import kotlinx.coroutines.ensureActive
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.launch
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.doubleOrNull
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.vosk.Model
import org.vosk.Recognizer
import org.vosk.android.RecognitionListener
import org.vosk.android.SpeechService
import org.vosk.android.StorageService
import javax.inject.Inject
import javax.inject.Singleton
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException
import kotlin.coroutines.suspendCoroutine

/** Pure wake-phrase rules from wakeWordService.ts (unit-testable). */
object WakeWordRules {
    const val MIN_CONFIDENCE = 0.85
    val WAKE_PHRASES = listOf("hey ai")
    val DECOYS = listOf(
        "yes", "no", "okay", "sure", "yeah", "um", "uh", "hi", "hello", "thanks", "thank you",
        "bye", "goodbye", "what", "why", "how", "please", "sorry", "hey",
    )

    /** Vosk grammar: wake phrase + decoys + "[unk]" as a JSON array. */
    fun grammarJson(): String = (WAKE_PHRASES + DECOYS + "[unk]").joinToString(",", "[", "]") { "\"$it\"" }

    fun matchesWakePhrase(text: String): Boolean {
        val n = text.trim().lowercase()
        return WAKE_PHRASES.any { n.contains(it) }
    }

    data class Hypothesis(val text: String, val confidence: Double?)

    private val json = Json { ignoreUnknownKeys = true }

    /** Parses a Vosk result; confidence = mean per-word `conf` when words are present. */
    fun parse(raw: String): Hypothesis = runCatching {
        val o = json.parseToJsonElement(raw).jsonObject
        val text = o["text"]?.jsonPrimitive?.content ?: raw
        val conf = o["confidence"]?.jsonPrimitive?.doubleOrNull ?: (o["result"] as? JsonArray)
            ?.mapNotNull { it.jsonObject["conf"]?.jsonPrimitive?.doubleOrNull }
            ?.takeIf { it.isNotEmpty() }
            ?.average()
        Hypothesis(text, conf)
    }.getOrElse { Hypothesis(raw, null) }

    fun shouldTrigger(h: Hypothesis): Boolean =
        matchesWakePhrase(h.text) && (h.confidence == null || h.confidence >= MIN_CONFIDENCE)
}

/** The recogniser behind the wake word: Vosk in the app, a fake in unit tests. */
internal interface WakeEngine {
    interface Listener {
        fun onResult(hypothesis: String)
        fun onFinalResult()
        fun onError()
        fun onTimeout()
    }

    /** Loads the model if needed and starts listening; a recogniser still running is stopped first. */
    suspend fun start(listener: Listener)

    fun stop()

    /** Stops and unloads the model. */
    fun unload()
}

/** Vosk with the bundled vosk-model-small-en-us, 16 kHz, grammar from [WakeWordRules]. */
internal class VoskWakeEngine(private val context: Context) : WakeEngine {
    private var model: Model? = null
    private var service: SpeechService? = null
    private var recognizer: Recognizer? = null

    private suspend fun loadModel(): Model = model ?: suspendCoroutine { cont ->
        StorageService.unpack(
            context,
            "model-en-us",
            "model",
            { m -> cont.resume(m) },
            { e -> cont.resumeWithException(e) },
        )
    }.also { model = it }

    override suspend fun start(listener: WakeEngine.Listener) {
        // Never replace a SpeechService that still holds the microphone.
        stop()
        val m = loadModel()
        // The model load is not cancellable: do not start listening for a caller that gave up.
        currentCoroutineContext().ensureActive()
        val rec = Recognizer(m, 16000f, WakeWordRules.grammarJson()).apply { setWords(true) }
        recognizer = rec
        val svc = SpeechService(rec, 16000f)
        service = svc
        svc.startListening(object : RecognitionListener {
            override fun onPartialResult(hypothesis: String?) = Unit
            override fun onResult(hypothesis: String?) { hypothesis?.let(listener::onResult) }
            override fun onFinalResult(hypothesis: String?) = listener.onFinalResult()
            override fun onError(exception: Exception?) = listener.onError()
            override fun onTimeout() = listener.onTimeout()
        })
    }

    override fun stop() {
        service?.let { svc ->
            runCatching { svc.stop() }
            runCatching { svc.shutdown() }
        }
        service = null
        recognizer?.let { runCatching { it.close() } }
        recognizer = null
    }

    override fun unload() {
        stop()
        model?.close()
        model = null
    }
}

/**
 * Hands-free wake word "hey ai" (Vosk, bundled vosk-model-small-en-us). Listens under the
 * foreground service while signed in, hands-free is on and the mic is granted; pauses while a
 * voice session runs; on trigger opens the chat panel, connects and brings the app forward.
 *
 * The foreground service is held for as long as hands-free is on (voiceSessionStore.ts
 * `stopCallForegroundService`): pausing for a call does not release it, only turning hands-free
 * off (or signing out) does.
 */
@Singleton
class WakeWordCoordinator internal constructor(
    private val session: SessionRepository,
    private val prefs: PrefsStore,
    private val voice: VoiceSession,
    private val connector: VoiceConnector,
    private val chat: ChatStore,
    private val foreground: ForegroundController,
    private val permissions: PermissionGateway,
    private val scope: CoroutineScope,
    private val engine: WakeEngine,
    private val micGranted: () -> Boolean,
    private val bringToFront: () -> Unit,
) {
    @Inject
    constructor(
        @ApplicationContext context: Context,
        session: SessionRepository,
        prefs: PrefsStore,
        voice: VoiceSession,
        connector: VoiceConnector,
        chat: ChatStore,
        foreground: ForegroundController,
        permissions: PermissionGateway,
        @ApplicationScope scope: CoroutineScope,
    ) : this(
        session = session,
        prefs = prefs,
        voice = voice,
        connector = connector,
        chat = chat,
        foreground = foreground,
        permissions = permissions,
        scope = scope,
        engine = VoskWakeEngine(context),
        micGranted = {
            ContextCompat.checkSelfPermission(context, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED
        },
        bringToFront = {
            runCatching {
                context.startActivity(
                    Intent(context, MainActivity::class.java)
                        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_REORDER_TO_FRONT),
                )
            }
        },
    )

    private var desired = false

    /** A listening session was requested (it may still be loading the model). */
    private var sessionActive = false

    /** The recogniser is running. */
    private var listening = false
    private var triggered = false

    /** Identifies the current recogniser run; callbacks of a run that was stopped are ignored. */
    private var engineRun = 0
    private var startFailures = 0
    private var restartJob: Job? = null
    private var started = false

    fun start() {
        if (started) return
        started = true
        scope.launch {
            combine(session.loggedIn, prefs.wakeWordEnabled) { a, b -> a && b }
                .distinctUntilChanged()
                .collect { enabled -> if (enabled) enable() else disable() }
        }
        // Pause while connecting/connected; resume 400 ms after the session is idle again.
        scope.launch {
            voice.state.map { it.status }.distinctUntilChanged().collect { st ->
                when (st) {
                    VoiceStatus.Connecting, VoiceStatus.Connected -> {
                        restartJob?.cancel()
                        stopListening()
                    }
                    VoiceStatus.Idle, VoiceStatus.Error -> if (desired) scheduleRestart(400)
                }
            }
        }
        // The OS dropped the service after accepting the start: no recogniser without it.
        scope.launch {
            foreground.refused.collect { reason ->
                if (reason == CzenForegroundService.Reasons.WAKE && desired) {
                    restartJob?.cancel()
                    stopListening()
                    retryLater()
                }
            }
        }
    }

    private fun enable() {
        desired = true
        startFailures = 0
        // Hands-free runs under the foreground service: make sure its notification can be shown.
        permissions.requestNotifications()
        scheduleRestart(0)
    }

    private fun disable() {
        desired = false
        restartJob?.cancel()
        stopListening()
        // Only turning hands-free off releases the service.
        foreground.stopWakeWord()
        engine.unload()
    }

    private fun scheduleRestart(delayMs: Long = 300) {
        restartJob?.cancel()
        restartJob = scope.launch {
            delay(delayMs)
            if (desired && !sessionActive && voice.state.value.status.let { it == VoiceStatus.Idle || it == VoiceStatus.Error }) {
                startListening()
            }
        }
    }

    private fun retryLater() {
        startFailures++
        if (desired) scheduleRestart(if (startFailures <= 3) 1000L * startFailures else 30_000L)
    }

    private suspend fun startListening() {
        if (sessionActive) return
        sessionActive = true
        triggered = false
        try {
            if (!micGranted()) throw SecurityException("RECORD_AUDIO not granted")
            // No recogniser without the service: a microphone held in the background is cut off.
            if (!foreground.startWakeWord()) throw IllegalStateException("foreground service refused")
            engine.start(listenerFor(++engineRun))
            listening = true
            startFailures = 0
        } catch (e: Exception) {
            stopListening()
            if (e is kotlinx.coroutines.CancellationException) throw e
            retryLater()
        }
    }

    /** Stops the recogniser; the foreground service stays while hands-free is on. */
    private fun stopListening() {
        // Whatever the stopped recogniser still reports (Vosk sends a final result on stop)
        // must not schedule a restart: the caller of this stop decides what happens next.
        engineRun++
        engine.stop()
        listening = false
        sessionActive = false
    }

    private fun listenerFor(run: Int) = object : WakeEngine.Listener {
        private val current get() = run == engineRun

        override fun onResult(hypothesis: String) {
            if (!current) return
            val h = WakeWordRules.parse(hypothesis)
            if (sessionActive && !triggered && WakeWordRules.shouldTrigger(h)) {
                triggered = true
                onDetected()
            }
        }

        override fun onFinalResult() {
            if (!current) return
            stopListening()
            if (!triggered && desired) scheduleRestart()
        }

        override fun onError() {
            if (!current) return
            stopListening()
            if (!triggered && desired) scheduleRestart(1_000)
        }

        override fun onTimeout() {
            if (!current) return
            stopListening()
            if (!triggered && desired) scheduleRestart()
        }
    }

    private fun onDetected() {
        restartJob?.cancel()
        stopListening()
        val phone = session.currentPhone()
        if (phone == null) {
            triggered = false
            if (desired) scheduleRestart()
            return
        }
        chat.openPanel()
        connector.connect(phone)
        bringToFront()
    }
}
