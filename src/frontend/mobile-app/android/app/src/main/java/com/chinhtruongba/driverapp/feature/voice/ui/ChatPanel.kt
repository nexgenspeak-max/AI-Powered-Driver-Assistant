package com.chinhtruongba.driverapp.feature.voice.ui

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBars
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.layout.wrapContentWidth
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.platform.LocalSoftwareKeyboardController
import androidx.compose.ui.res.stringArrayResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.hilt.lifecycle.viewmodel.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.chinhtruongba.driverapp.R
import com.chinhtruongba.driverapp.core.model.VoiceLang
import com.chinhtruongba.driverapp.designsystem.glass.GlassKind
import com.chinhtruongba.driverapp.designsystem.glass.LocalHazeState
import com.chinhtruongba.driverapp.designsystem.glass.glass
import com.chinhtruongba.driverapp.designsystem.icons.CzenIcon
import com.chinhtruongba.driverapp.designsystem.icons.CzenMark
import com.chinhtruongba.driverapp.designsystem.icons.Icon
import com.chinhtruongba.driverapp.designsystem.theme.Brand
import com.chinhtruongba.driverapp.designsystem.theme.CzenTheme
import com.chinhtruongba.driverapp.designsystem.theme.Radii
import com.chinhtruongba.driverapp.feature.voice.ChatMessage
import com.chinhtruongba.driverapp.feature.voice.Speaker
import com.chinhtruongba.driverapp.feature.voice.VoiceState
import com.chinhtruongba.driverapp.feature.voice.VoiceStatus
import dev.chrisbanes.haze.hazeSource
import dev.chrisbanes.haze.rememberHazeState

private data class ChipSpec(val label: Int, val dot: Color, val bg: Color, val fg: Color)

@Composable
private fun StatusChip(voice: VoiceState, lang: VoiceLang) {
    val c = CzenTheme.colors
    val en = lang == VoiceLang.En
    val spec = when {
        voice.status == VoiceStatus.Connected && voice.isMicMuted ->
            ChipSpec(if (en) R.string.voice_chip_mic_off_en else R.string.voice_chip_mic_off_vn, c.warning, c.warningContainer, c.onWarningContainer)
        voice.status == VoiceStatus.Connected ->
            ChipSpec(if (en) R.string.voice_chip_listening_en else R.string.voice_chip_listening_vn, c.success, c.successContainer, c.onSuccessContainer)
        voice.status == VoiceStatus.Connecting ->
            ChipSpec(if (en) R.string.voice_chip_connecting_en else R.string.voice_chip_connecting_vn, c.primary, c.primaryContainer, c.onPrimaryContainer)
        voice.status == VoiceStatus.Error ->
            ChipSpec(if (en) R.string.voice_chip_error_en else R.string.voice_chip_error_vn, c.danger, c.dangerContainer, c.onDangerContainer)
        else -> ChipSpec(if (en) R.string.voice_chip_off_en else R.string.voice_chip_off_vn, c.textMuted, c.chip, c.textSecondary)
    }
    Row(
        Modifier.clip(RoundedCornerShape(50)).background(spec.bg).padding(horizontal = 10.dp, vertical = 4.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        Box(Modifier.size(6.dp).clip(CircleShape).background(spec.dot))
        Text(stringResource(spec.label), style = CzenTheme.type.caption, color = spec.fg)
    }
}

private fun captionRes(voice: VoiceState, lang: VoiceLang): Int {
    val en = lang == VoiceLang.En
    return when {
        voice.status == VoiceStatus.Connected && voice.isCallActive -> if (en) R.string.voice_caption_in_call_en else R.string.voice_caption_in_call_vn
        voice.status == VoiceStatus.Connected && voice.isMicMuted -> if (en) R.string.voice_caption_mic_off_en else R.string.voice_caption_mic_off_vn
        voice.status == VoiceStatus.Connected -> if (en) R.string.voice_caption_connected_en else R.string.voice_caption_connected_vn
        voice.status == VoiceStatus.Connecting -> if (en) R.string.voice_caption_connecting_en else R.string.voice_caption_connecting_vn
        voice.status == VoiceStatus.Error -> if (en) R.string.voice_caption_error_en else R.string.voice_caption_error_vn
        else -> if (en) R.string.voice_caption_idle_en else R.string.voice_caption_idle_vn
    }
}

/** Full-screen Czen conversation (AssistantChatPanel.tsx) with frosted header and composer. */
@Composable
fun AssistantChatPanel(onClose: () -> Unit, vm: AssistantViewModel = hiltViewModel()) {
    val c = CzenTheme.colors
    val voice by vm.voiceState.collectAsStateWithLifecycle()
    val chats by vm.chats.collectAsStateWithLifecycle()
    val lang by vm.lang.collectAsStateWithLifecycle()
    val panel by vm.panel.collectAsStateWithLifecycle()
    val actions = rememberVoiceActions(vm)
    val haze = rememberHazeState()
    val list = rememberLazyListState()
    val keyboard = LocalSoftwareKeyboardController.current
    val canned = stringArrayResource(R.array.chat_canned_replies).toList()
    val emptyReply = stringResource(R.string.chat_canned_empty)
    val suggestions = stringArrayResource(if (lang == VoiceLang.En) R.array.voice_suggestions_en else R.array.voice_suggestions_vn).toList()
    val send: (String) -> Unit = { text ->
        keyboard?.hide()
        vm.send(text, canned, emptyReply)
    }

    BackHandler(onBack = onClose)

    // Index of the trailing "extra" rows after the bubbles, for auto-scroll.
    val showTrailingChips = chats.isNotEmpty() && chats.none { it.who == Speaker.Me }
    val itemCount = chats.size + (if (panel.stubLoading) 1 else 0) + (if (panel.error) 1 else 0) + (if (showTrailingChips) 1 else 0)
    LaunchedEffect(itemCount, chats.lastOrNull()?.msg) {
        if (itemCount > 0) list.animateScrollToItem(itemCount - 1)
    }

    Box(Modifier.fillMaxSize().background(c.surface).imePadding()) {
        // Ambient brand glow behind the conversation, so the frosted chrome has something to refract.
        Box(
            Modifier
                .fillMaxSize()
                .hazeSource(haze)
                .background(
                    Brush.verticalGradient(
                        0f to c.primaryContainer.copy(alpha = if (c.isDark) 0.55f else 0.65f),
                        0.35f to c.surface,
                        1f to c.surface,
                    ),
                ),
        ) {
            LazyColumn(
                state = list,
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(
                    start = 20.dp,
                    end = 20.dp,
                    top = WindowInsets.statusBars.asPaddingTop() + 52.dp + 24.dp,
                    bottom = WindowInsets.navigationBars.asPaddingBottom() + 56.dp + 28.dp,
                ),
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                if (chats.isEmpty()) {
                    item(key = "empty") {
                        EmptyConversation(voice.status == VoiceStatus.Connected, suggestions, send, Modifier.fillParentMaxHeight(0.8f))
                    }
                }
                itemsIndexed(chats, key = { i, _ -> i }) { _, m -> Bubble(m) }
                if (panel.stubLoading) {
                    item(key = "stub") { Text(stringResource(R.string.chat_replying), style = CzenTheme.type.caption, color = c.textSecondary) }
                }
                if (panel.error) {
                    item(key = "err") { Text(stringResource(R.string.chat_empty_send), style = CzenTheme.type.caption, color = c.danger) }
                }
                if (showTrailingChips) {
                    item(key = "chips") { SuggestionChips(suggestions, send, centered = false, Modifier.padding(top = 8.dp)) }
                }
            }
        }

        CompositionLocalProvider(LocalHazeState provides haze) {
            // Header: chevron-down + "Czen" + status chip, caption by voice language.
            Box(
                Modifier
                    .fillMaxWidth()
                    .glass(RoundedCornerShape(bottomStart = 24.dp, bottomEnd = 24.dp), kind = GlassKind.Frosted, elevation = 12.dp)
                    .windowInsetsPadding(WindowInsets.statusBars),
            ) {
                Row(Modifier.fillMaxWidth().height(60.dp).padding(horizontal = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                    val minimize = stringResource(R.string.chat_minimize)
                    Box(
                        Modifier.size(48.dp).clip(CircleShape).clickable(role = Role.Button, onClick = onClose).semantics { contentDescription = minimize },
                        contentAlignment = Alignment.Center,
                    ) {
                        Icon(CzenIcon.ChevronDown, size = 26.dp, color = c.textPrimary)
                    }
                    Column(Modifier.weight(1f).padding(start = 4.dp), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            Text(stringResource(R.string.chat_title), style = CzenTheme.type.h2, color = c.textPrimary, maxLines = 1)
                            StatusChip(voice, lang)
                        }
                        Text(
                            stringResource(captionRes(voice, lang)),
                            style = CzenTheme.type.caption,
                            color = c.textSecondary,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                        )
                    }
                    Spacer(Modifier.width(48.dp))
                }
            }

            Composer(
                voice = voice,
                draft = panel.draft,
                onDraft = vm::onDraft,
                onSend = { send(panel.draft) },
                onToggleMute = vm::toggleMute,
                onVoice = {
                    when (voice.status) {
                        VoiceStatus.Connected -> actions.perform(if (voice.isCallActive) OrbAction.ConfirmCancelCall else OrbAction.Disconnect)
                        VoiceStatus.Connecting -> Unit
                        else -> actions.onOrbTap()
                    }
                },
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .windowInsetsPadding(WindowInsets.navigationBars)
                    .padding(start = 20.dp, end = 20.dp, bottom = 12.dp),
            )
        }
    }
}

@Composable
private fun WindowInsets.asPaddingTop() = with(androidx.compose.ui.platform.LocalDensity.current) { getTop(this).toDp() }

@Composable
private fun WindowInsets.asPaddingBottom() = with(androidx.compose.ui.platform.LocalDensity.current) { getBottom(this).toDp() }

@Composable
private fun EmptyConversation(connected: Boolean, suggestions: List<String>, onPick: (String) -> Unit, modifier: Modifier) {
    val c = CzenTheme.colors
    Column(
        modifier.fillMaxWidth().padding(vertical = 24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(16.dp, Alignment.CenterVertically),
    ) {
        Box(
            Modifier
                .size(72.dp)
                .shadow(18.dp, CircleShape, ambientColor = Brand.Primary, spotColor = Brand.Primary)
                .clip(CircleShape)
                .background(c.primaryContainer)
                .border(1.dp, Brush.verticalGradient(listOf(Color.White.copy(alpha = 0.45f), Color.Transparent)), CircleShape),
            contentAlignment = Alignment.Center,
        ) {
            CzenMark(size = 40.dp, color = c.onPrimaryContainer)
        }
        Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Text(stringResource(R.string.chat_empty_title), style = CzenTheme.type.title, color = c.textPrimary)
            Text(
                stringResource(if (connected) R.string.chat_empty_connected else R.string.chat_empty_idle),
                style = CzenTheme.type.body,
                color = c.textSecondary,
                textAlign = TextAlign.Center,
                modifier = Modifier.padding(horizontal = 12.dp),
            )
        }
        SuggestionChips(suggestions, onPick, centered = true)
    }
}

@Composable
private fun SuggestionChips(items: List<String>, onPick: (String) -> Unit, centered: Boolean, modifier: Modifier = Modifier) {
    val c = CzenTheme.colors
    FlowRow(
        modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(8.dp, if (centered) Alignment.CenterHorizontally else Alignment.Start),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        items.forEach { s ->
            Text(
                s,
                style = CzenTheme.type.label,
                color = c.textPrimary,
                modifier = Modifier
                    .clip(RoundedCornerShape(50))
                    .background(c.chip)
                    .border(1.dp, c.border, RoundedCornerShape(50))
                    .clickable(role = Role.Button) { onPick(s) }
                    .padding(horizontal = 14.dp, vertical = 10.dp),
            )
        }
    }
}

@Composable
private fun Bubble(m: ChatMessage) {
    val c = CzenTheme.colors
    val shape = RoundedCornerShape(Radii.bubble)
    val alpha = if (m.streaming) 0.78f else 1f
    Box(Modifier.fillMaxWidth(), contentAlignment = if (m.who == Speaker.Me) Alignment.CenterEnd else Alignment.CenterStart) {
        when (m.who) {
            Speaker.Me -> Text(
                m.msg,
                style = CzenTheme.type.body,
                color = Color.White,
                modifier = Modifier
                    .widthIn(max = 300.dp)
                    .fillMaxWidth(0.8f)
                    .wrapContentWidth(Alignment.End)
                    .alpha(alpha)
                    .shadow(8.dp, shape, ambientColor = Brand.Primary, spotColor = Brand.Primary)
                    .clip(shape)
                    .background(Brush.linearGradient(Brand.CtaGradient))
                    .padding(horizontal = 16.dp, vertical = 10.dp),
            )
            Speaker.Customer -> Column(
                Modifier
                    .fillMaxWidth(0.8f)
                    .wrapContentWidth(Alignment.Start)
                    .alpha(alpha)
                    .clip(shape)
                    .background(if (c.isDark) c.surfaceElevated else c.warningContainer)
                    .padding(horizontal = 16.dp, vertical = 10.dp),
            ) {
                Text(stringResource(R.string.chat_customer), style = CzenTheme.type.caption, color = c.textSecondary)
                Spacer(Modifier.height(4.dp))
                Text(m.msg, style = CzenTheme.type.body, color = c.textPrimary)
            }
            Speaker.Bot -> Text(
                m.msg,
                style = CzenTheme.type.body,
                color = c.textPrimary,
                modifier = Modifier
                    .fillMaxWidth(0.8f)
                    .wrapContentWidth(Alignment.Start)
                    .alpha(alpha)
                    .clip(shape)
                    .background(if (c.isDark) Brand.Accent else c.surfaceElevated)
                    .then(if (c.isDark) Modifier else Modifier.border(1.dp, c.border, shape))
                    .padding(horizontal = 16.dp, vertical = 10.dp),
            )
        }
    }
}

@Composable
private fun Composer(
    voice: VoiceState,
    draft: String,
    onDraft: (String) -> Unit,
    onSend: () -> Unit,
    onToggleMute: () -> Unit,
    onVoice: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val c = CzenTheme.colors
    val connected = voice.status == VoiceStatus.Connected
    val connecting = voice.status == VoiceStatus.Connecting
    Row(
        modifier
            .widthIn(max = 640.dp)
            .fillMaxWidth()
            .height(56.dp)
            .glass(RoundedCornerShape(28.dp), kind = GlassKind.Frosted, elevation = 18.dp)
            .padding(start = 6.dp, end = 6.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        val muteLabel = stringResource(if (voice.isMicMuted) R.string.chat_mic_on_a11y else R.string.chat_mic_off_a11y)
        Box(
            Modifier
                .size(44.dp)
                .clip(CircleShape)
                .background(if (voice.isMicMuted) c.dangerContainer else Color.Transparent)
                .clickable(enabled = connected, role = Role.Switch, onClick = onToggleMute)
                .semantics {
                    contentDescription = muteLabel
                    selected = voice.isMicMuted
                }
                .alpha(if (connected) 1f else 0.35f),
            contentAlignment = Alignment.Center,
        ) {
            Icon(if (voice.isMicMuted) CzenIcon.MicOff else CzenIcon.Mic, size = 20.dp, color = if (voice.isMicMuted) c.danger else c.textPrimary)
        }
        val placeholder = stringResource(
            when {
                connecting -> R.string.chat_placeholder_connecting
                connected -> R.string.chat_placeholder_connected
                else -> R.string.chat_placeholder_idle
            },
        )
        Box(Modifier.weight(1f).padding(start = 2.dp), contentAlignment = Alignment.CenterStart) {
            if (draft.isEmpty()) Text(placeholder, style = CzenTheme.type.body, color = c.textMuted, maxLines = 1, overflow = TextOverflow.Ellipsis)
            BasicTextField(
                value = draft,
                onValueChange = onDraft,
                enabled = !connecting,
                singleLine = true,
                textStyle = CzenTheme.type.body.copy(color = c.textPrimary),
                cursorBrush = SolidColor(if (c.isDark) c.secondary else c.primary),
                keyboardOptions = KeyboardOptions(imeAction = ImeAction.Send),
                keyboardActions = KeyboardActions(onSend = { onSend() }),
                modifier = Modifier.fillMaxWidth().semantics { contentDescription = placeholder },
            )
        }
        if (draft.isNotBlank()) {
            val sendLabel = stringResource(R.string.chat_send)
            Box(
                Modifier
                    .size(44.dp)
                    .clip(CircleShape)
                    .background(c.primary)
                    .clickable(enabled = !connecting, role = Role.Button, onClick = onSend)
                    .semantics { contentDescription = sendLabel }
                    .alpha(if (connecting) 0.5f else 1f),
                contentAlignment = Alignment.Center,
            ) {
                Icon(CzenIcon.Send, size = 18.dp, color = Color.White, strokeWidth = 2.1f)
            }
        } else {
            ComposerVoiceButton(voice, onVoice)
        }
    }
}

/** 44 dp gradient voice control: Czen mark (connect), spinner, or 4 live level bars (end). */
@Composable
fun ComposerVoiceButton(voice: VoiceState, onClick: () -> Unit) {
    val connected = voice.status == VoiceStatus.Connected
    val label = stringResource(if (connected) R.string.chat_voice_end else R.string.chat_voice_connect)
    val reduceMotion = rememberReduceMotion()
    Box(
        Modifier
            .size(44.dp)
            .shadow(10.dp, CircleShape, ambientColor = Brand.Primary, spotColor = Brand.Primary)
            .clip(CircleShape)
            .background(Brush.linearGradient(Brand.OrbIdle))
            .border(1.dp, Brush.verticalGradient(listOf(Color.White.copy(alpha = 0.5f), Color.Transparent)), CircleShape)
            .clickable(enabled = voice.status != VoiceStatus.Connecting, role = Role.Button, onClick = onClick)
            .semantics { contentDescription = label },
        contentAlignment = Alignment.Center,
    ) {
        when (voice.status) {
            VoiceStatus.Connecting -> CircularProgressIndicator(Modifier.size(20.dp), color = Color.White, strokeWidth = 2.dp)
            VoiceStatus.Connected -> WaveBars(
                voice.agentAudioLevel, voice.agentSpeaking, reduceMotion, Color.White,
                count = 4, barWidth = 3.dp, gap = 3.dp, minH = 5.dp, maxH = 18.dp,
            )
            else -> CzenMark(size = 24.dp, color = Color.White)
        }
    }
}
