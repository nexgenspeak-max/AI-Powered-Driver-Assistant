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
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.jsonPrimitive

class FakeAuthApi(var user: AuthUser = AuthUser(id = "a1", name = "Khoa", phone = "0901234567", status = "offline")) : AuthApi {
    override suspend fun login(body: JsonObject) = AuthTokens("acc", "ref")
    override suspend fun register(body: JsonObject) = RegisterResponse("acc", "ref", user)
    override suspend fun me() = user
    override suspend fun updateAccount(id: String, body: JsonObject) = user
    override suspend fun settings(accountId: String) = AccountSettings()
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
    override suspend fun context(fresh: Boolean?) = context
    override suspend fun profile() = DriverProfile()
    override suspend fun earningsSummary(period: String) = EarningsSummary(period)
    override suspend fun pushLocation(body: JsonObject) = buildJsonObject {}
    override suspend fun pushLiveLocation(body: JsonObject) = buildJsonObject {}
    override suspend fun navigation(fromLat: Double, fromLng: Double, toLat: Double, toLng: Double) = NavigationRoute()
    override suspend fun trip(id: String): Trip = error("unused")
    override suspend fun createTrip(body: CreateTripRequest): Trip = error("unused")
    override suspend fun updateTrip(id: String, body: JsonObject): Trip = error("unused")
    override suspend fun voiceToken(phone: String, lang: String) = VoiceToken("t", "room", "wss://x")
}

class FakePrefs : PrefsStore {
    override val theme: Flow<ThemeMode> = MutableStateFlow(ThemeMode.Dark)
    override val voiceLang = MutableStateFlow(VoiceLang.Vn)
    override val wakeWordEnabled: Flow<Boolean> = MutableStateFlow(false)
    override suspend fun setTheme(mode: ThemeMode) = Unit
    override suspend fun setVoiceLang(lang: VoiceLang) { voiceLang.value = lang }
    override suspend fun setWakeWordEnabled(enabled: Boolean) = Unit
}

class FakeEngine : VoiceEngine {
    var listener: VoiceEngineListener? = null
    var connected = false
    val published = mutableListOf<Pair<String, String>>()
    override val isActive get() = connected
    override val isDisconnected get() = !connected
    override suspend fun startAudioSession() = Unit
    override suspend fun stopAudioSession() = Unit
    override suspend fun connect(url: String, token: String, listener: VoiceEngineListener) {
        this.listener = listener
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
    override fun startCall() { calls++ }
    override fun stopCall() { calls-- }
    override fun startWakeWord() = Unit
    override fun stopWakeWord() = Unit
}

class FakeContacts : ContactsSource {
    override suspend fun search(query: String) = listOf(ContactMatch("Mẹ", "0912000111"))
}
