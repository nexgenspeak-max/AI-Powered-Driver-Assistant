package com.chinhtruongba.driverapp.app

import android.content.Intent
import com.chinhtruongba.driverapp.BuildConfig
import com.chinhtruongba.driverapp.core.data.ApplicationScope
import com.chinhtruongba.driverapp.core.data.SessionRepository
import com.chinhtruongba.driverapp.core.model.ThemeMode
import com.chinhtruongba.driverapp.core.storage.PrefsStore
import com.chinhtruongba.driverapp.feature.voice.ChatStore
import com.chinhtruongba.driverapp.feature.voice.VoiceSession
import com.chinhtruongba.driverapp.feature.voice.VoiceStatus
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import javax.inject.Inject
import javax.inject.Singleton

/**
 * `driver-app://` links. Debug builds keep the RN dev routes (dev-login, dev-say); the demo
 * flavor adds `demo/offer`, `demo/theme?mode=` and `open/<tab|screen>` for screenshots.
 */
@Singleton
class DeepLinks @Inject constructor(
    private val session: SessionRepository,
    private val prefs: PrefsStore,
    private val chat: ChatStore,
    private val voice: VoiceSession,
    private val demo: DemoHooks,
    @param:ApplicationScope private val scope: CoroutineScope,
) {
    private val _route = MutableStateFlow<Route?>(null)
    /** A navigation request for the signed-in shell (consumed with [consumeRoute]). */
    val route: StateFlow<Route?> = _route.asStateFlow()

    private val _status = MutableStateFlow<String?>(null)
    val devLoginStatus: StateFlow<String?> = _status.asStateFlow()

    fun consumeRoute() { _route.value = null }

    fun handle(intent: Intent) {
        val uri = intent.data ?: return
        if (uri.scheme != "driver-app") return
        val path = listOfNotNull(uri.host, *uri.pathSegments.toTypedArray()).filter { it.isNotBlank() && it != "(app)" }
        val dev = BuildConfig.DEBUG || demo.isDemo
        when {
            dev && path.firstOrNull() == "dev-login" -> {
                val phone = uri.getQueryParameter("phone")
                val pw = uri.getQueryParameter("password")
                scope.launch {
                    if (phone.isNullOrBlank() || pw.isNullOrBlank()) {
                        _status.value = "missing"
                        return@launch
                    }
                    _status.value = "progress"
                    runCatching { session.login(phone, pw) }
                        .onSuccess { _status.value = null }
                        .onFailure { _status.value = "error:${it.message}" }
                }
            }
            dev && path.firstOrNull() == "dev-say" -> {
                val text = uri.getQueryParameter("text").orEmpty()
                scope.launch {
                    if (uri.getQueryParameter("clear") == "1") chat.clear()
                    if (text.isBlank()) return@launch
                    if (voice.state.value.status == VoiceStatus.Connected) {
                        chat.upsertStreaming(com.chinhtruongba.driverapp.feature.voice.Speaker.Me, text, true)
                        voice.sendText(text)
                    } else {
                        chat.addUserMessage(text)
                    }
                }
            }
            demo.isDemo && path == listOf("demo", "offer") -> demo.triggerOffer()
            demo.isDemo && path == listOf("demo", "theme") -> scope.launch {
                prefs.setTheme(if (uri.getQueryParameter("mode") == "light") ThemeMode.Light else ThemeMode.Dark)
            }
            demo.isDemo && path == listOf("demo", "chat") -> scope.launch {
                chat.openPanel()
                val phone = session.me.first { it.data != null }.data?.phone ?: return@launch
                if (voice.state.value.status == VoiceStatus.Idle || voice.state.value.status == VoiceStatus.Error) voice.connect(phone)
            }
            dev && path.firstOrNull() == "open" -> _route.value = when (path.getOrNull(1)) {
                "home" -> Route.Home
                "trips" -> Route.Trips
                "earnings" -> Route.Earnings
                "profile" -> Route.Profile
                "add-trip" -> Route.AddTrip
                "edit-profile" -> Route.EditProfile
                "vehicle" -> Route.Vehicle
                "assistant-settings" -> Route.AssistantSettings
                "bank-info" -> Route.BankInfo
                "documents" -> Route.Documents
                "safety" -> Route.Safety
                "support" -> Route.Support
                "terms" -> Route.Terms
                "about" -> Route.About
                "faq" -> Route.Faq
                else -> null
            }
        }
    }
}
