package com.chinhtruongba.driverapp.feature.settings

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.unit.dp
import androidx.hilt.lifecycle.viewmodel.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewModelScope
import com.chinhtruongba.driverapp.R
import com.chinhtruongba.driverapp.core.data.SessionRepository
import com.chinhtruongba.driverapp.core.model.AccountSettings
import com.chinhtruongba.driverapp.core.model.VoiceLang
import com.chinhtruongba.driverapp.core.storage.PrefsStore
import com.chinhtruongba.driverapp.core.util.Format
import com.chinhtruongba.driverapp.designsystem.components.CzenToggle
import com.chinhtruongba.driverapp.designsystem.components.Divider
import com.chinhtruongba.driverapp.designsystem.components.Screen
import com.chinhtruongba.driverapp.designsystem.components.Skeleton
import com.chinhtruongba.driverapp.designsystem.components.SurfaceCard
import com.chinhtruongba.driverapp.designsystem.icons.CzenIcon
import com.chinhtruongba.driverapp.designsystem.icons.Icon
import com.chinhtruongba.driverapp.designsystem.theme.Brand
import com.chinhtruongba.driverapp.designsystem.theme.CzenTheme
import com.chinhtruongba.driverapp.feature.location.LocationTracker
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.filterNotNull
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import javax.inject.Inject

val NOTIFY_RADII = listOf(500, 1000, 2000, 3000)

data class AssistantSettingsUiState(
    val loaded: Boolean = false,
    val settings: AccountSettings? = null,
    val lang: VoiceLang = VoiceLang.Vn,
)

/** Server settings with optimistic rollback; voice language and wake word are local. */
@HiltViewModel
class AssistantSettingsViewModel @Inject constructor(
    private val session: SessionRepository,
    private val prefs: PrefsStore,
    private val tracker: LocationTracker,
) : ViewModel() {
    private val settings = MutableStateFlow<AccountSettings?>(null)

    val ui: StateFlow<AssistantSettingsUiState> = combine(settings, prefs.voiceLang, session.me) { s, lang, me ->
        AssistantSettingsUiState(loaded = me.data != null && s != null, settings = s, lang = lang)
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), AssistantSettingsUiState())

    init {
        viewModelScope.launch {
            session.me.map { it.data }.filterNotNull().first()
            runCatching { session.settings() }.onSuccess {
                settings.value = it
                prefs.setWakeWordEnabled(it.handsFreeMode) // mirror into the local wake-word store
            }
        }
    }

    fun setLang(l: VoiceLang) {
        viewModelScope.launch { prefs.setVoiceLang(l) }
    }

    private fun mutate(optimistic: (AccountSettings) -> AccountSettings, body: JsonObject, onSuccess: (AccountSettings) -> Unit = {}) {
        val prev = settings.value ?: return
        val next = optimistic(prev)
        settings.value = next
        if (next.handsFreeMode != prev.handsFreeMode) viewModelScope.launch { prefs.setWakeWordEnabled(next.handsFreeMode) }
        viewModelScope.launch {
            try {
                val saved = session.updateSettings(body)
                settings.value = saved
                onSuccess(saved)
            } catch (e: CancellationException) {
                throw e
            } catch (_: Exception) {
                settings.value = prev
                if (next.handsFreeMode != prev.handsFreeMode) prefs.setWakeWordEnabled(prev.handsFreeMode)
            }
        }
    }

    fun setCallMode(mode: String) = mutate({ it.copy(defaultCustomerCallMode = mode) }, buildJsonObject { put("default_customer_call_mode", mode) })

    fun setHandsFree(v: Boolean) = mutate({ it.copy(handsFreeMode = v) }, buildJsonObject { put("hands_free_mode", v) })

    fun setNotify(v: Boolean) = mutate({ it.copy(notifyOnPickupApproach = v) }, buildJsonObject { put("notify_on_pickup_approach", v) }) {
        if (v) tracker.pushImmediate("notify")
    }

    fun setNotifyRadius(r: Int) = mutate({ it.copy(notifyRadiusM = r) }, buildJsonObject { put("notify_on_pickup_approach_radius_m", r) }) {
        tracker.pushImmediate("notify")
    }

    fun setSuggest(v: Boolean) = mutate({ it.copy(autoSuggestNextStop = v) }, buildJsonObject { put("auto_suggest_next_stop", v) }) {
        if (v) tracker.pushImmediate("suggest")
    }
}

@Composable
fun AssistantSettingsScreen(onBack: () -> Unit, vm: AssistantSettingsViewModel = hiltViewModel()) {
    val s by vm.ui.collectAsStateWithLifecycle()
    val c = CzenTheme.colors
    Screen(stringResource(R.string.profile_assistant_settings), onBack) {
        val st = s.settings
        if (!s.loaded || st == null) {
            Skeleton(Modifier.fillMaxWidth(0.5f).height(28.dp), radius = 8.dp)
            Skeleton(Modifier.fillMaxWidth().height(48.dp), radius = 12.dp)
            Skeleton(Modifier.fillMaxWidth().height(160.dp), radius = 24.dp)
            Skeleton(Modifier.fillMaxWidth().height(120.dp), radius = 24.dp)
            return@Screen
        }
        Text(stringResource(R.string.as_intro), style = CzenTheme.type.body, color = c.textSecondary)
        Text(stringResource(R.string.as_intro_lang), style = CzenTheme.type.body, color = c.textSecondary)
        SurfaceCard(flat = true) {
            Column {
                ChoiceGroup(
                    icon = CzenIcon.Language,
                    title = stringResource(R.string.as_lang),
                    options = listOf(
                        Choice("vn", stringResource(R.string.as_lang_vn), null),
                        Choice("en", stringResource(R.string.as_lang_en), null),
                    ),
                    selected = s.lang.routing,
                    onSelect = { vm.setLang(VoiceLang.resolve(it)) },
                )
                Divider()
                ChoiceGroup(
                    icon = CzenIcon.Phone,
                    title = stringResource(R.string.as_call_mode),
                    options = listOf(
                        Choice("agent", stringResource(R.string.as_call_agent), stringResource(R.string.as_call_agent_desc)),
                        Choice("bridge", stringResource(R.string.as_call_bridge), stringResource(R.string.as_call_bridge_desc)),
                    ),
                    selected = st.defaultCustomerCallMode,
                    onSelect = vm::setCallMode,
                )
                Divider()
                ToggleRow(CzenIcon.Mic, stringResource(R.string.as_hands_free), stringResource(R.string.as_hands_free_desc), st.handsFreeMode, vm::setHandsFree)
                Divider()
                ToggleRow(
                    CzenIcon.Phone,
                    stringResource(R.string.as_notify),
                    stringResource(R.string.as_notify_desc, Format.radius(st.notifyRadiusM)),
                    st.notifyOnPickupApproach,
                    vm::setNotify,
                )
                AnimatedVisibility(st.notifyOnPickupApproach) {
                    Column(Modifier.padding(start = 66.dp, end = 16.dp, bottom = 14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text(stringResource(R.string.as_notify_radius), style = CzenTheme.type.label, color = c.textSecondary)
                        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            NOTIFY_RADII.forEach { r ->
                                val sel = r == st.notifyRadiusM
                                Text(
                                    Format.radius(r),
                                    style = CzenTheme.type.label,
                                    color = if (sel) c.onPrimaryContainer else c.textSecondary,
                                    modifier = Modifier
                                        .clip(RoundedCornerShape(50))
                                        .background(if (sel) c.chipSelected else c.chip)
                                        .border(1.dp, if (sel) c.primary else c.border, RoundedCornerShape(50))
                                        .selectable(sel, role = Role.RadioButton) { vm.setNotifyRadius(r) }
                                        .padding(horizontal = 14.dp, vertical = 8.dp),
                                )
                            }
                        }
                    }
                }
                Divider()
                ToggleRow(
                    CzenIcon.Route,
                    stringResource(R.string.as_suggest),
                    stringResource(R.string.as_suggest_desc, Format.radius(st.autoSuggestRadiusM)),
                    st.autoSuggestNextStop,
                    vm::setSuggest,
                )
            }
        }
    }
}

private data class Choice(val key: String, val label: String, val desc: String?)

@Composable
private fun RowIcon(icon: CzenIcon) {
    val c = CzenTheme.colors
    Box(Modifier.size(36.dp).clip(RoundedCornerShape(12.dp)).background(Brand.PrimaryMuted), contentAlignment = Alignment.Center) {
        Icon(icon, size = 20.dp, color = c.primary)
    }
}

@Composable
private fun ChoiceGroup(icon: CzenIcon, title: String, options: List<Choice>, selected: String, onSelect: (String) -> Unit) {
    val c = CzenTheme.colors
    Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(14.dp)) {
            RowIcon(icon)
            Text(title, style = CzenTheme.type.bodyStrong, color = c.textPrimary)
        }
        options.forEach { o ->
            val sel = o.key == selected
            Row(
                Modifier
                    .padding(start = 50.dp)
                    .fillMaxWidth()
                    .heightIn(min = 48.dp)
                    .clip(RoundedCornerShape(14.dp))
                    .background(if (sel) c.chipSelected else c.surfaceVariant.copy(alpha = 0.5f))
                    .border(1.dp, if (sel) c.primary.copy(alpha = 0.6f) else c.border, RoundedCornerShape(14.dp))
                    .selectable(sel, role = Role.RadioButton) { onSelect(o.key) }
                    .padding(horizontal = 14.dp, vertical = 10.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                    Text(o.label, style = CzenTheme.type.body, color = c.textPrimary)
                    o.desc?.let { Text(it, style = CzenTheme.type.caption, color = c.textSecondary) }
                }
                Box(
                    Modifier.size(22.dp).clip(CircleShape).border(2.dp, if (sel) c.primary else c.borderStrong, CircleShape),
                    contentAlignment = Alignment.Center,
                ) {
                    if (sel) Box(Modifier.size(12.dp).clip(CircleShape).background(c.primary))
                }
            }
        }
    }
}

@Composable
private fun ToggleRow(icon: CzenIcon, label: String, desc: String, value: Boolean, onChange: (Boolean) -> Unit) {
    val c = CzenTheme.colors
    Row(
        Modifier.fillMaxWidth().clickable(role = Role.Switch) { onChange(!value) }.padding(horizontal = 16.dp, vertical = 14.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        RowIcon(icon)
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
            Text(label, style = CzenTheme.type.bodyStrong, color = c.textPrimary)
            Text(desc, style = CzenTheme.type.caption, color = c.textSecondary)
        }
        CzenToggle(value, onChange, contentDescription = label, onColor = c.primary)
    }
}
