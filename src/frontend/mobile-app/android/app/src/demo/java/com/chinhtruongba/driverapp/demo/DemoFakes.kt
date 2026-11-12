package com.chinhtruongba.driverapp.demo

import com.chinhtruongba.driverapp.core.model.LatLng
import com.chinhtruongba.driverapp.feature.location.Fix
import com.chinhtruongba.driverapp.feature.location.LocationSource
import com.chinhtruongba.driverapp.feature.voice.ContactMatch
import com.chinhtruongba.driverapp.feature.voice.ContactsSource
import com.chinhtruongba.driverapp.feature.voice.VoiceEngine
import com.chinhtruongba.driverapp.feature.voice.VoiceEngineListener
import com.chinhtruongba.driverapp.feature.voice.VoiceTopics
import com.chinhtruongba.driverapp.core.util.Search
import com.chinhtruongba.driverapp.app.DemoHooks
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import javax.inject.Inject
import javax.inject.Singleton
import kotlin.math.abs
import kotlin.math.sin

/**
 * Scripted voice session for the demo flavor: streams a greeting in interim chunks, answers
 * typed or suggested messages, and drives the agent audio level so the orb animates.
 */
@Singleton
class FakeVoiceEngine @Inject constructor() : VoiceEngine {
    private var scope: CoroutineScope? = null
    private var listener: VoiceEngineListener? = null
    private var connected = false
    private var levelJob: Job? = null
    private var segment = 0

    override val isActive: Boolean get() = connected
    override val isDisconnected: Boolean get() = false

    override suspend fun startAudioSession() = Unit
    override suspend fun stopAudioSession() = Unit

    override suspend fun connect(url: String, token: String, listener: VoiceEngineListener) {
        delay(500)
        this.listener = listener
        connected = true
        val s = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)
        scope = s
        s.launch {
            delay(700)
            speak("Chào anh Khoa! Em là Czen. Anh đang có 2 chuyến chạy, điểm tiếp theo là đón chị Thu Hà ở 36 Hàng Bài, cách khoảng 650 mét.")
        }
    }

    private suspend fun speak(text: String) {
        val l = listener ?: return
        val id = "seg-${segment++}"
        l.onData(VoiceTopics.AGENT_STATE, """{"type":"agent_state","state":"speaking"}""".encodeToByteArray())
        startLevel()
        val words = text.split(' ')
        val sb = StringBuilder()
        for ((i, w) in words.withIndex()) {
            if (sb.isNotEmpty()) sb.append(' ')
            sb.append(w)
            if (i % 3 == 2 || i == words.lastIndex) {
                l.onText("agent-czen", false, VoiceTopics.TRANSCRIPTION, id, sb.toString(), false)
                delay(140)
            }
        }
        l.onText("agent-czen", false, VoiceTopics.TRANSCRIPTION, id, sb.toString(), true)
        delay(300)
        levelJob?.cancel()
        l.onAgentLevel(0f)
        l.onData(VoiceTopics.AGENT_STATE, """{"type":"agent_state","state":"listening"}""".encodeToByteArray())
    }

    private fun startLevel() {
        levelJob?.cancel()
        levelJob = scope?.launch {
            var t = 0.0
            while (isActive) {
                t += 0.35
                listener?.onAgentLevel((0.25 + 0.6 * abs(sin(t)) * (0.6 + 0.4 * sin(t * 2.3))).toFloat().coerceIn(0f, 1f))
                delay(90)
            }
        }
    }

    override suspend fun disconnect() {
        connected = false
        levelJob?.cancel()
        scope?.cancel()
        scope = null
        listener = null
    }

    override suspend fun setMicrophoneEnabled(enabled: Boolean): Boolean = true

    override suspend fun sendText(text: String, topic: String) {
        val l = listener ?: return
        l.onText("driver-demo", true, VoiceTopics.CHAT, null, text, true)
        scope?.launch {
            delay(500)
            speak(reply(text))
        }
    }

    private fun reply(q: String): String {
        val f = Search.fold(q)
        return when {
            "thu nhap" in f || "earning" in f -> "Hôm nay anh đã chạy 7 chuyến, thu nhập 845.000 đồng, thêm 50.000 đồng thưởng."
            "lich" in f || "schedule" in f -> "Anh có 2 chuyến đang chạy và 2 chuyến đang chờ. Chuyến gần nhất đón lúc 6 phút nữa ở Hàng Bài."
            "goi" in f || "call" in f -> "Em gọi chị Thu Hà giúp anh nhé. Đang kết nối cuộc gọi."
            "dau tiep" in f || "where" in f -> "Anh nên đón chị Thu Hà ở 36 Hàng Bài trước, rồi trả anh Đức ở Văn Miếu, cuối cùng là Lotte Center."
            else -> "Em đã ghi nhận. Anh cần em giúp gì thêm không?"
        }
    }

    override suspend fun publishData(topic: String, payload: ByteArray) = Unit
}

/**
 * A GPS position near Hồ Hoàn Kiếm (the start of the bundled optimized route); the
 * `driver-app://demo/location?lat=&lng=` link moves it.
 */
@Singleton
class FakeLocationSource @Inject constructor() : LocationSource {
    @Volatile
    private var here = Fix(LatLng(21.0285, 105.8522), heading = 200f)
    private val _last = MutableStateFlow<Fix?>(here)

    fun moveTo(at: LatLng) {
        here = Fix(at, heading = here.heading)
        _last.value = here.copy(timeMs = System.currentTimeMillis())
    }
    override val last: StateFlow<Fix?> = _last

    override fun hasForegroundPermission(): Boolean = true
    override fun hasBackgroundPermission(): Boolean = true

    override fun updates(intervalMs: Long, minDistanceM: Float): Flow<Fix> = flow {
        while (true) {
            val f = here.copy(timeMs = System.currentTimeMillis())
            _last.value = f
            emit(f)
            delay(intervalMs)
        }
    }

    override suspend fun currentFix(): Fix = here.copy(timeMs = System.currentTimeMillis())
}

@Singleton
class FakeContactsSource @Inject constructor() : ContactsSource {
    private val book = listOf(
        ContactMatch("Mẹ", "0912000111"),
        ContactMatch("Anh Tuấn (tổng đài)", "0243 999 888"),
        ContactMatch("Nguyễn Thu Hà", "0903111222"),
        ContactMatch("Lê Văn Đức", "0904555666"),
    )

    override suspend fun search(query: String): List<ContactMatch> =
        book.filter { Search.matches(query, listOf(it.name)) }.take(5)
}

@Singleton
class DemoHooksImpl @Inject constructor(
    private val backend: FakeBackend,
    private val location: FakeLocationSource,
) : DemoHooks {
    override val isDemo: Boolean = true
    override fun triggerOffer() = backend.triggerOffer()
    override fun moveTo(lat: Double, lng: Double) = location.moveTo(LatLng(lat, lng))
}
