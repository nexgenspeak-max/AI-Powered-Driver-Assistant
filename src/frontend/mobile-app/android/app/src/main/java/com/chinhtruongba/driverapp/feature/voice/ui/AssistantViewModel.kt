package com.chinhtruongba.driverapp.feature.voice.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.chinhtruongba.driverapp.core.data.SessionRepository
import com.chinhtruongba.driverapp.core.model.VoiceLang
import com.chinhtruongba.driverapp.core.storage.PrefsStore
import com.chinhtruongba.driverapp.feature.voice.ChatMessage
import com.chinhtruongba.driverapp.feature.voice.ChatStore
import com.chinhtruongba.driverapp.feature.voice.Speaker
import com.chinhtruongba.driverapp.feature.voice.VoiceSession
import com.chinhtruongba.driverapp.feature.voice.VoiceState
import com.chinhtruongba.driverapp.feature.voice.VoiceStatus
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

/** What an orb tap should do (assistantTabButtonShared.tsx tap logic). */
sealed interface OrbAction {
    data object Ignore : OrbAction
    data object OpenPanel : OrbAction
    data object ConfirmCancelCall : OrbAction
    data object Disconnect : OrbAction
    data class Connect(val phone: String) : OrbAction
    data object MissingPhone : OrbAction
}

fun orbActionFor(state: VoiceState, panelOpen: Boolean, phone: String?): OrbAction = when (state.status) {
    VoiceStatus.Connecting -> OrbAction.Ignore
    VoiceStatus.Connected -> when {
        !panelOpen -> OrbAction.OpenPanel
        state.isCallActive -> OrbAction.ConfirmCancelCall
        else -> OrbAction.Disconnect
    }
    VoiceStatus.Idle, VoiceStatus.Error -> if (phone.isNullOrBlank()) OrbAction.MissingPhone else OrbAction.Connect(phone)
}

data class PanelUi(
    val draft: String = "",
    val error: Boolean = false,
    val stubLoading: Boolean = false,
)

@HiltViewModel
class AssistantViewModel @Inject constructor(
    private val voice: VoiceSession,
    private val chat: ChatStore,
    private val session: SessionRepository,
    prefs: PrefsStore,
) : ViewModel() {
    val voiceState: StateFlow<VoiceState> = voice.state
    val panelOpen: StateFlow<Boolean> = chat.panelOpen
    val chats: StateFlow<List<ChatMessage>> = chat.chats
    val lang: StateFlow<VoiceLang> = prefs.voiceLang.stateIn(viewModelScope, SharingStarted.Eagerly, VoiceLang.Vn)

    /** Latest finished bot reply, for the glass toast above the orb. */
    val lastBotReply: StateFlow<String?> = chat.chats
        .map { list -> list.lastOrNull()?.takeIf { it.who == Speaker.Bot && !it.streaming }?.msg }
        .stateIn(viewModelScope, SharingStarted.Eagerly, null)

    private val _panel = MutableStateFlow(PanelUi())
    val panel: StateFlow<PanelUi> = _panel.asStateFlow()
    private var sending = false

    fun orbAction(): OrbAction = orbActionFor(voice.state.value, chat.panelOpen.value, session.currentPhone())

    fun openPanel() = chat.openPanel()
    fun closePanel() = chat.closePanel()

    fun connect(phone: String) {
        chat.openPanel()
        voice.connect(phone)
    }

    /** Composer / orb button: connect when idle, end the session when connected. */
    fun disconnect() = voice.disconnect(userInitiated = true)

    /** Confirming adds the "me" bubble "Huỷ cuộc gọi" ([bubble]) and sends call_control cancel. */
    fun confirmCancelCall(bubble: String) {
        chat.addUserMessage(bubble)
        viewModelScope.launch { voice.cancelCall() }
    }

    fun toggleMute() {
        val s = voice.state.value
        if (s.status != VoiceStatus.Connected) return
        viewModelScope.launch { voice.setMicMuted(!s.isMicMuted) }
    }

    fun onDraft(v: String) = _panel.update { it.copy(draft = v, error = false) }

    /** Shared by the composer and suggestion chips; offline text goes to the canned stub. */
    fun send(raw: String, cannedReplies: List<String>, emptyReply: String) {
        if (sending) return
        if (raw.isBlank()) {
            _panel.update { it.copy(error = true) }
            return
        }
        sending = true
        _panel.update { it.copy(draft = "", error = false) }
        viewModelScope.launch {
            try {
                if (voice.state.value.status == VoiceStatus.Connected) {
                    // Single bubble via the lk.chat echo.
                    chat.upsertStreaming(Speaker.Me, raw, true)
                    if (voice.sendText(raw)) return@launch
                } else {
                    chat.addUserMessage(raw)
                }
                _panel.update { it.copy(stubLoading = true) }
                delay(600)
                chat.addBotMessage(if (raw.isNotBlank()) cannedReplies.random() else emptyReply)
            } finally {
                _panel.update { it.copy(stubLoading = false) }
                sending = false
            }
        }
    }
}
