package com.chinhtruongba.driverapp.feature

import com.chinhtruongba.driverapp.core.model.AccountSettings
import com.chinhtruongba.driverapp.core.model.AuthTokens
import com.chinhtruongba.driverapp.core.model.AuthUser
import com.chinhtruongba.driverapp.core.model.CreateTripRequest
import com.chinhtruongba.driverapp.core.model.DriverContext
import com.chinhtruongba.driverapp.core.model.DriverProfile
import com.chinhtruongba.driverapp.core.model.EarningsSummary
import com.chinhtruongba.driverapp.core.model.NavigationRoute
import com.chinhtruongba.driverapp.core.model.RegisterResponse
import com.chinhtruongba.driverapp.core.model.ThemeMode
import com.chinhtruongba.driverapp.core.model.Trip
import com.chinhtruongba.driverapp.core.model.VoiceLang
import com.chinhtruongba.driverapp.core.model.VoiceToken
import com.chinhtruongba.driverapp.core.network.AuthApi
import com.chinhtruongba.driverapp.core.network.TripApi
import com.chinhtruongba.driverapp.core.storage.PrefsStore
import com.chinhtruongba.driverapp.feature.voice.ContactMatch
import com.chinhtruongba.driverapp.feature.voice.ContactsSource
import com.chinhtruongba.driverapp.feature.voice.FillerAudio
import com.chinhtruongba.driverapp.feature.voice.ForegroundController
import com.chinhtruongba.driverapp.feature.voice.VoiceEngine
import com.chinhtruongba.driverapp.feature.voice.VoiceEngineListener
import com.chinhtruongba.driverapp.app.PermissionAsker
import com.chinhtruongba.driverapp.core.model.LatLng
import com.chinhtruongba.driverapp.feature.location.Fix
import com.chinhtruongba.driverapp.feature.location.LocationSource
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.awaitCancellation
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.jsonPrimitive

class FakeAuthApi(var user: AuthUser = AuthUser(id = "a1", name = "Khoa", phone = "0901234567", status = "offline")) : AuthApi {
    var failMe = false
    var meCalls = 0
    var failSettings = false
    override suspend fun login(body: JsonObject) = AuthTokens("acc", "ref")
    override suspend fun register(body: JsonObject) = RegisterResponse("acc", "ref", user)
    override suspend fun me(): AuthUser {
        meCalls++
        if (failMe) error("offline")
        return user
    }
    override suspend fun updateAccount(id: String, body: JsonObject) = user
    override suspend fun settings(accountId: String): AccountSettings {
        if (failSettings) error("offline")
        return AccountSettings()
    }
    override suspend fun updateSettings(accountId: String, body: JsonObject) = AccountSettings()
}

class FakeTripApi : TripApi {
    var failUpdateDriver = false
    var context = DriverContext()
    override suspend fun updateDriver(phone: String, body: JsonObject): JsonObject {
        if (failUpdateDriver) error("boom")
        context = context.copy(driver = context.driver.copy(status = body["status"]!!.jsonPrimitive.content))
        return buildJsonObject {}
    }
    var contextCalls = 0

    /** When set, `context()` answers (with the context at call time) only once it completes. */
    var contextGate: CompletableDeferred<Unit>? = null
    override suspend fun context(fresh: Boolean?): DriverContext {
        contextCalls++
        val answer = context
        contextGate?.await()
        return answer
    }
    override suspend fun profile() = DriverProfile()
    override suspend fun earningsSummary(period: String) = EarningsSummary(period)
    override suspend fun pushLocation(body: JsonObject) = buildJsonObject {}
    override suspend fun pushLiveLocation(body: JsonObject) = buildJsonObject {}
    var route: suspend (toLat: Double, toLng: Double) -> NavigationRoute = { _, _ -> NavigationRoute() }
    override suspend fun navigation(fromLat: Double, fromLng: Double, toLat: Double, toLng: Double) = route(toLat, toLng)
    val trips = mutableMapOf<String, Trip>()
    override suspend fun trip(id: String): Trip = trips[id] ?: error("unused")
    override suspend fun createTrip(body: CreateTripRequest): Trip = error("unused")
    override suspend fun updateTrip(id: String, body: JsonObject): Trip = error("unused")
    override suspend fun voiceToken(phone: String, lang: String) = VoiceToken("t", "room", "wss://x")
}

class FakePrefs : PrefsStore {
    override val theme: Flow<ThemeMode> = MutableStateFlow(ThemeMode.Dark)
    override val voiceLang = MutableStateFlow(VoiceLang.Vn)
    override val wakeWordEnabled = MutableStateFlow(false)
    override suspend fun setTheme(mode: ThemeMode) = Unit
    override suspend fun setVoiceLang(lang: VoiceLang) { voiceLang.value = lang }
    override suspend fun setWakeWordEnabled(enabled: Boolean) { wakeWordEnabled.value = enabled }
}

class FakeEngine : VoiceEngine {
    var listener: VoiceEngineListener? = null
    var connected = false
    var connects = 0
    val published = mutableListOf<Pair<String, String>>()
    override val isActive get() = connected
    override val isDisconnected get() = !connected
    override suspend fun startAudioSession() = Unit
    override suspend fun stopAudioSession() = Unit
    override suspend fun connect(url: String, token: String, listener: VoiceEngineListener) {
        this.listener = listener
        connects++
        connected = true
    }
    override suspend fun disconnect() { connected = false }
    var micAvailable = true
    override suspend fun setMicrophoneEnabled(enabled: Boolean) = !enabled || micAvailable
    var failSendText = false
    override suspend fun sendText(text: String, topic: String) {
        if (failSendText) throw IllegalStateException("data channel closed")
    }
    override suspend fun publishData(topic: String, payload: ByteArray) { published += topic to payload.decodeToString() }
}

class NoFiller : FillerAudio {
    override suspend fun playConnecting() = Unit
    override suspend fun handoffConnecting() = Unit
    override fun stopConnecting() = Unit
    override suspend fun playDisconnecting() = Unit
    override fun stopDisconnecting() = Unit
    override fun playNewTripAlert() = Unit
}

class RecordingForeground : ForegroundController {
    var calls = 0

    /** The service is held for the wake word. */
    var wake = false
    var refuseWake = false
    val refusals = MutableSharedFlow<String>(extraBufferCapacity = 8)
    override val refused: Flow<String> = refusals
    var refuseCall = false
    override fun startCall(): Boolean {
        if (refuseCall) return false
        calls++
        return true
    }
    override fun stopCall() { calls-- }
    override fun startWakeWord(): Boolean {
        if (refuseWake) return false
        wake = true
        return true
    }
    override fun stopWakeWord() { wake = false }
}

/** A [PermissionAsker] that answers at once with [answer] and records what was asked. */
class FakeAsker(private val answer: (String) -> Boolean = { true }) : PermissionAsker {
    val asked = mutableListOf<List<String>>()
    override fun requestEach(permissions: Array<String>, onResult: (Map<String, Boolean>) -> Unit) {
        asked += permissions.toList()
        onResult(permissions.associateWith(answer))
    }
}

/** A location source with a fixed last fix that counts GPS watches. */
class FixedLocationSource(fix: Fix? = Fix(LatLng(21.0, 105.8))) : LocationSource {
    var watchers = 0

    /** Watches running right now. */
    var active = 0
    var background = false
    override val last = MutableStateFlow(fix)
    override fun hasForegroundPermission() = true
    override fun hasBackgroundPermission() = background
    override fun updates(intervalMs: Long, minDistanceM: Float): Flow<Fix> = flow {
        watchers++
        active++
        try {
            awaitCancellation()
        } finally {
            active--
        }
    }
    override suspend fun currentFix(): Fix? = last.value
}

/** ViewModels use Dispatchers.Main: run the test with Main on the test scheduler. */
fun runMainTest(block: suspend TestScope.() -> Unit) {
    val main = StandardTestDispatcher()
    Dispatchers.setMain(main)
    try {
        // Main is reset only after runTest has wound down everything that still uses it.
        runTest(main) { block() }
    } finally {
        Dispatchers.resetMain()
    }
}

class FakeContacts : ContactsSource {
    override suspend fun search(query: String) = listOf(ContactMatch("Mẹ", "0912000111"))
}
