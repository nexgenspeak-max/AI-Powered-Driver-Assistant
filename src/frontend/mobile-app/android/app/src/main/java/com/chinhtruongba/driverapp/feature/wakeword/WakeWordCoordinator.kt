package com.chinhtruongba.driverapp.feature.wakeword

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import androidx.core.content.ContextCompat
import com.chinhtruongba.driverapp.MainActivity
import com.chinhtruongba.driverapp.core.data.ApplicationScope
import com.chinhtruongba.driverapp.core.data.SessionRepository
import com.chinhtruongba.driverapp.core.storage.PrefsStore
import com.chinhtruongba.driverapp.feature.voice.ChatStore
import com.chinhtruongba.driverapp.feature.voice.ForegroundController
import com.chinhtruongba.driverapp.feature.voice.VoiceSession
import com.chinhtruongba.driverapp.feature.voice.VoiceStatus
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
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

/**
 * Hands-free wake word "hey ai" (Vosk, bundled vosk-model-small-en-us). Listens under the
 * foreground service while signed in, hands-free is on and the mic is granted; pauses while a
 * voice session runs; on trigger opens the chat panel, connects and brings the app forward.
 */
@Singleton
class WakeWordCoordinator @Inject constructor(
    @param:ApplicationContext private val context: Context,
    private val session: SessionRepository,
    private val prefs: PrefsStore,
    private val voice: VoiceSession,
    private val chat: ChatStore,
    private val foreground: ForegroundController,
    @param:ApplicationScope private val scope: CoroutineScope,
) {
    private var model: Model? = null
    private var service: SpeechService? = null
    private var recognizer: Recognizer? = null
    private var desired = false
    private var sessionActive = false
    private var triggered = false
    private var startFailures = 0
    private var restartJob: Job? = null
    private var stopWatchdog: Job? = null
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
    }

    private fun micGranted() =
        ContextCompat.checkSelfPermission(context, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED

    private fun enable() {
        desired = true
        startFailures = 0
        scheduleRestart(0)
    }

    private fun disable() {
        desired = false
        restartJob?.cancel()
        stopListening()
        foreground.stopWakeWord()
        // Disable unloads the model.
        model?.close()
        model = null
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

    private suspend fun loadModel(): Model = model ?: suspendCoroutine { cont ->
        StorageService.unpack(
            context,
            "model-en-us",
            "model",
            { m -> cont.resume(m) },
            { e -> cont.resumeWithException(e) },
        )
    }.also { model = it }

    private suspend fun startListening() {
        if (sessionActive) return
        sessionActive = true
        triggered = false
        try {
            if (!micGranted()) throw SecurityException("RECORD_AUDIO not granted")
            val m = loadModel()
            foreground.startWakeWord()
            val rec = Recognizer(m, 16000f, WakeWordRules.grammarJson()).apply { setWords(true) }
            recognizer = rec
            val svc = SpeechService(rec, 16000f)
            service = svc
            svc.startListening(listener)
            startFailures = 0
        } catch (e: Exception) {
            if (e is kotlinx.coroutines.CancellationException) throw e
            sessionActive = false
            releaseRecognizer()
            startFailures++
            if (desired) scheduleRestart(if (startFailures <= 3) 1000L * startFailures else 30_000L)
        }
    }

    private fun stopListening() {
        val svc = service ?: run {
            sessionActive = false
            return
        }
        // Force-reset if the native stop is never confirmed.
        stopWatchdog?.cancel()
        stopWatchdog = scope.launch {
            delay(2_500)
            sessionActive = false
        }
        runCatching { svc.stop() }
        runCatching { svc.shutdown() }
        service = null
        releaseRecognizer()
        sessionActive = false
        foreground.stopWakeWord()
    }

    private fun releaseRecognizer() {
        recognizer?.let { runCatching { it.close() } }
        recognizer = null
    }

    private val listener = object : RecognitionListener {
        override fun onPartialResult(hypothesis: String?) = Unit

        override fun onResult(hypothesis: String?) {
            val h = WakeWordRules.parse(hypothesis ?: return)
            if (sessionActive && !triggered && WakeWordRules.shouldTrigger(h)) {
                triggered = true
                onDetected()
            }
        }

        override fun onFinalResult(hypothesis: String?) {
            sessionActive = false
            if (!triggered) scheduleRestart()
        }

        override fun onError(exception: Exception?) {
            stopListening()
            if (!triggered && desired) scheduleRestart(1_000)
        }

        override fun onTimeout() {
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
        voice.connect(phone)
        runCatching {
            context.startActivity(
                Intent(context, MainActivity::class.java)
                    .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_REORDER_TO_FRONT),
            )
        }
    }
}
