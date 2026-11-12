package com.chinhtruongba.driverapp.feature.profile

import android.content.Intent
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringArrayResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.core.net.toUri
import androidx.hilt.lifecycle.viewmodel.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.chinhtruongba.driverapp.BuildConfig
import com.chinhtruongba.driverapp.R
import com.chinhtruongba.driverapp.app.Route
import com.chinhtruongba.driverapp.designsystem.components.ButtonVariant
import com.chinhtruongba.driverapp.designsystem.components.CzenAlert
import com.chinhtruongba.driverapp.designsystem.components.CzenButton
import com.chinhtruongba.driverapp.designsystem.components.CzenTextField
import com.chinhtruongba.driverapp.designsystem.components.Divider
import com.chinhtruongba.driverapp.designsystem.components.Dot
import com.chinhtruongba.driverapp.designsystem.components.EmptyState
import com.chinhtruongba.driverapp.designsystem.components.LetterAvatar
import com.chinhtruongba.driverapp.designsystem.components.Screen
import com.chinhtruongba.driverapp.designsystem.components.SectionTitle
import com.chinhtruongba.driverapp.designsystem.components.Skeleton
import com.chinhtruongba.driverapp.designsystem.components.SurfaceCard
import com.chinhtruongba.driverapp.designsystem.components.ThemeToggle
import com.chinhtruongba.driverapp.designsystem.icons.CzenIcon
import com.chinhtruongba.driverapp.designsystem.icons.Icon
import com.chinhtruongba.driverapp.designsystem.theme.BadgeTone
import com.chinhtruongba.driverapp.designsystem.theme.CzenTheme
import com.chinhtruongba.driverapp.designsystem.components.Badge
import com.chinhtruongba.driverapp.feature.auth.VehicleTypeSelect
import java.util.Locale

@Composable
fun ProfileScreen(onOpen: (Route) -> Unit, vm: ProfileViewModel = hiltViewModel()) {
    val s by vm.ui.collectAsStateWithLifecycle()
    val c = CzenTheme.colors
    Screen(stringResource(R.string.profile_title), onBack = null) {
        val user = s.user
        when {
            user == null || (s.loading && s.profile == null) -> {
                Skeleton(Modifier.fillMaxWidth().height(150.dp), radius = 24.dp)
                Skeleton(Modifier.fillMaxWidth().height(180.dp), radius = 24.dp)
            }
            s.error -> EmptyState(
                CzenIcon.AlertCircle,
                stringResource(R.string.profile_error),
                actionLabel = stringResource(R.string.common_retry),
                onAction = vm::retry,
            )
            else -> {
                SurfaceCard {
                    Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                            LetterAvatar(user.name, size = 64.dp, glossy = true)
                            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                                Text(user.name, style = CzenTheme.type.h2, color = c.textPrimary, maxLines = 1, overflow = TextOverflow.Ellipsis)
                                Text(user.phone.orEmpty(), style = CzenTheme.type.caption, color = c.textSecondary)
                                Row(
                                    Modifier.padding(top = 4.dp).clip(RoundedCornerShape(50))
                                        .background(if (s.online) c.successContainer else c.chip)
                                        .padding(horizontal = 10.dp, vertical = 3.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                                ) {
                                    Dot(if (s.online) c.success else c.textMuted, size = 7.dp)
                                    Text(
                                        stringResource(if (s.online) R.string.profile_badge_online else R.string.profile_badge_offline),
                                        style = CzenTheme.type.caption,
                                        color = if (s.online) c.onSuccessContainer else c.textSecondary,
                                    )
                                }
                            }
                        }
                        if (!user.vehicleName.isNullOrBlank()) {
                            Divider()
                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                                Icon(CzenIcon.Car, size = 20.dp, color = c.textSecondary)
                                Text(user.vehicleName, style = CzenTheme.type.body, color = c.textPrimary, modifier = Modifier.weight(1f), maxLines = 1)
                                if (!user.vehiclePlate.isNullOrBlank()) {
                                    Text(
                                        user.vehiclePlate,
                                        style = CzenTheme.type.label,
                                        color = c.textPrimary,
                                        modifier = Modifier.border(1.dp, c.borderStrong, RoundedCornerShape(8.dp)).padding(horizontal = 10.dp, vertical = 4.dp),
                                    )
                                }
                            }
                        }
                    }
                }
                s.profile?.let { p ->
                    SectionTitle(stringResource(R.string.profile_stats))
                    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        StatCard(stringResource(R.string.profile_rating), String.format(Locale.US, "%.2f", p.rating), CzenIcon.Star, Modifier.weight(1f))
                        StatCard(stringResource(R.string.profile_total_trips), p.totalTrips.toString(), CzenIcon.Chart, Modifier.weight(1f))
                    }
                    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        StatCard(stringResource(R.string.profile_accept_rate), "${Math.round(p.acceptanceRate)}%", CzenIcon.ThumbsUp, Modifier.weight(1f))
                        StatCard(stringResource(R.string.profile_complete_rate), "${Math.round(p.completionRate)}%", CzenIcon.CheckCircle, Modifier.weight(1f))
                    }
                }
            }
        }
        MenuSection(stringResource(R.string.profile_section_account)) {
            MenuRow(CzenIcon.Edit, stringResource(R.string.profile_edit)) { onOpen(Route.EditProfile) }
            MenuRow(CzenIcon.Car, stringResource(R.string.profile_vehicle), last = true) { onOpen(Route.Vehicle) }
        }
        MenuSection(stringResource(R.string.profile_section_payment)) {
            MenuRow(CzenIcon.Card, stringResource(R.string.profile_bank)) { onOpen(Route.BankInfo) }
            MenuRow(CzenIcon.DocumentText, stringResource(R.string.profile_documents), last = true) { onOpen(Route.Documents) }
        }
        MenuSection(stringResource(R.string.profile_section_support)) {
            MenuRow(CzenIcon.ShieldCheck, stringResource(R.string.profile_safety)) { onOpen(Route.Safety) }
            MenuRow(CzenIcon.Support, stringResource(R.string.profile_support)) { onOpen(Route.Support) }
            MenuRow(CzenIcon.Document, stringResource(R.string.profile_terms), last = true) { onOpen(Route.Terms) }
        }
        MenuSection(stringResource(R.string.profile_section_settings)) {
            MenuRow(CzenIcon.Mic, stringResource(R.string.profile_assistant_settings)) { onOpen(Route.AssistantSettings) }
            Row(Modifier.fillMaxWidth().padding(start = 16.dp, end = 8.dp).heightIn(min = 56.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(14.dp)) {
                MenuIcon(CzenIcon.Moon, c.primary)
                Text(stringResource(R.string.profile_dark_mode), style = CzenTheme.type.body, color = c.textPrimary, modifier = Modifier.weight(1f))
                ThemeToggle(s.dark, vm::toggleTheme)
            }
            Divider(Modifier.padding(start = 66.dp))
            MenuRow(CzenIcon.Info, stringResource(R.string.profile_about)) { onOpen(Route.About) }
            MenuRow(CzenIcon.Help, stringResource(R.string.profile_faq)) { onOpen(Route.Faq) }
            MenuRow(CzenIcon.Logout, stringResource(R.string.profile_logout), danger = true, last = true, onClick = vm::askLogout)
        }
        Text(
            stringResource(R.string.profile_version, BuildConfig.VERSION_NAME),
            style = CzenTheme.type.caption,
            color = c.textMuted,
            textAlign = TextAlign.Center,
            modifier = Modifier.fillMaxWidth().padding(top = 4.dp),
        )
    }
    if (s.confirmLogout) {
        CzenAlert(
            stringResource(R.string.logout_title), stringResource(R.string.logout_body),
            confirmLabel = stringResource(R.string.profile_logout), onConfirm = vm::logout,
            onDismiss = vm::dismissLogout, cancelLabel = stringResource(R.string.logout_stay), destructive = true,
        )
    }
}

@Composable
private fun StatCard(label: String, value: String, icon: CzenIcon, modifier: Modifier) {
    val c = CzenTheme.colors
    SurfaceCard(modifier, flat = true) {
        Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Box(Modifier.size(32.dp).clip(RoundedCornerShape(10.dp)).background(c.primaryContainer), contentAlignment = Alignment.Center) {
                Icon(icon, size = 18.dp, color = c.onPrimaryContainer)
            }
            Text(value, style = CzenTheme.type.h2, color = c.textPrimary)
            Text(label, style = CzenTheme.type.caption, color = c.textSecondary, maxLines = 1)
        }
    }
}

@Composable
private fun MenuSection(title: String, content: @Composable () -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        SectionTitle(title)
        SurfaceCard(flat = true) { Column { content() } }
    }
}

@Composable
private fun MenuIcon(icon: CzenIcon, tint: Color) {
    Box(Modifier.size(36.dp).clip(RoundedCornerShape(12.dp)).background(tint.copy(alpha = 0.14f)), contentAlignment = Alignment.Center) {
        Icon(icon, size = 20.dp, color = tint)
    }
}

@Composable
private fun MenuRow(icon: CzenIcon, label: String, danger: Boolean = false, last: Boolean = false, trailing: String? = null, onClick: () -> Unit) {
    val c = CzenTheme.colors
    val color = if (danger) c.danger else c.textPrimary
    Row(
        Modifier
            .fillMaxWidth()
            .heightIn(min = 56.dp)
            .clickable(role = Role.Button, onClick = onClick)
            .padding(horizontal = 16.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        MenuIcon(icon, if (danger) c.danger else c.primary)
        Text(label, style = CzenTheme.type.body, color = color, modifier = Modifier.weight(1f))
        trailing?.let { Text(it, style = CzenTheme.type.bodyStrong, color = c.textSecondary) }
        if (!danger) Icon(CzenIcon.ChevronRight, size = 18.dp, color = c.textMuted)
    }
    if (!last) Divider(Modifier.padding(start = 66.dp))
}

@Composable
private fun SavedAlert(result: SaveResult?, savedBody: Int, failedBody: Int, onDismiss: () -> Unit) {
    if (result == null) return
    CzenAlert(
        stringResource(if (result == SaveResult.Saved) R.string.common_saved else R.string.common_error),
        stringResource(if (result == SaveResult.Saved) savedBody else failedBody),
        confirmLabel = stringResource(R.string.common_ok),
        onConfirm = onDismiss,
        onDismiss = onDismiss,
    )
}

@Composable
fun EditProfileScreen(onBack: () -> Unit, vm: EditProfileViewModel = hiltViewModel()) {
    val s by vm.ui.collectAsStateWithLifecycle()
    val c = CzenTheme.colors
    Screen(stringResource(R.string.profile_edit), onBack) {
        Column(Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(10.dp)) {
            LetterAvatar(s.name.ifBlank { s.user?.name.orEmpty() }, size = 88.dp, glossy = true)
            Text(stringResource(R.string.edit_profile_caption), style = CzenTheme.type.caption, color = c.textSecondary)
        }
        CzenTextField(s.name, vm::onName, stringResource(R.string.edit_profile_name), placeholder = stringResource(R.string.edit_profile_name_placeholder), capitalization = KeyboardCapitalization.Words)
        CzenTextField(s.user?.phone.orEmpty(), {}, stringResource(R.string.field_phone), readOnly = true, keyboardType = KeyboardType.Phone)
        CzenTextField(s.user?.email.orEmpty(), {}, stringResource(R.string.field_email), readOnly = true)
        CzenButton(stringResource(R.string.common_save_changes), vm::save, Modifier.fillMaxWidth(), enabled = s.canSave || s.saving, loading = s.saving)
    }
    SavedAlert(s.result, R.string.edit_profile_saved, R.string.edit_profile_failed, vm::dismiss)
}

@Composable
fun VehicleScreen(onBack: () -> Unit, vm: VehicleViewModel = hiltViewModel()) {
    val s by vm.ui.collectAsStateWithLifecycle()
    Screen(stringResource(R.string.profile_vehicle), onBack) {
        VehicleTypeSelect(s.type, vm::onType, null, auth = false)
        CzenTextField(s.name, vm::onName, stringResource(R.string.vehicle_name), placeholder = stringResource(R.string.vehicle_name_placeholder), capitalization = KeyboardCapitalization.Words)
        CzenTextField(s.plate, vm::onPlate, stringResource(R.string.vehicle_plate), placeholder = stringResource(R.string.vehicle_plate_placeholder), capitalization = KeyboardCapitalization.Characters)
        CzenButton(stringResource(R.string.common_save_changes), vm::save, Modifier.fillMaxWidth(), enabled = s.changed || s.saving, loading = s.saving)
    }
    SavedAlert(s.result, R.string.vehicle_saved, R.string.vehicle_failed, vm::dismiss)
}

@Composable
fun BankInfoScreen(onBack: () -> Unit) {
    var soon by remember { mutableStateOf(false) }
    Screen(stringResource(R.string.profile_bank), onBack) {
        SurfaceCard {
            EmptyState(
                CzenIcon.Card,
                stringResource(R.string.bank_empty_title),
                message = stringResource(R.string.bank_empty_body),
                actionLabel = stringResource(R.string.bank_add),
                onAction = { soon = true },
                actionVariant = ButtonVariant.Primary,
            )
        }
    }
    if (soon) {
        CzenAlert(stringResource(R.string.common_coming_soon), null, stringResource(R.string.common_ok), { soon = false }, { soon = false })
    }
}

@Composable
fun DocumentsScreen(onBack: () -> Unit) {
    val c = CzenTheme.colors
    var soon by remember { mutableStateOf(false) }
    val docs = listOf(R.string.docs_license to CzenIcon.Card, R.string.docs_registration to CzenIcon.DocumentText, R.string.docs_insurance to CzenIcon.ShieldCheck)
    Screen(stringResource(R.string.profile_documents), onBack) {
        Text(stringResource(R.string.docs_intro), style = CzenTheme.type.body, color = c.textSecondary)
        SurfaceCard(flat = true) {
            Column {
                docs.forEachIndexed { i, (res, icon) ->
                    Row(
                        Modifier.fillMaxWidth().heightIn(min = 60.dp).clickable(role = Role.Button) { soon = true }.padding(horizontal = 16.dp, vertical = 10.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(14.dp),
                    ) {
                        MenuIcon(icon, c.primary)
                        Text(stringResource(res), style = CzenTheme.type.body, color = c.textPrimary, modifier = Modifier.weight(1f))
                        Badge(stringResource(R.string.docs_not_uploaded), BadgeTone.Yellow)
                        Icon(CzenIcon.DocumentUpload, size = 18.dp, color = c.textMuted)
                    }
                    if (i < docs.lastIndex) Divider(Modifier.padding(start = 66.dp))
                }
            }
        }
    }
    if (soon) {
        CzenAlert(stringResource(R.string.common_coming_soon), stringResource(R.string.docs_coming_soon), stringResource(R.string.common_ok), { soon = false }, { soon = false })
    }
}

private fun open(context: android.content.Context, uri: String, action: String = Intent.ACTION_VIEW) {
    runCatching { context.startActivity(Intent(action, uri.toUri()).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)) }
}

@Composable
fun SafetyScreen(onBack: () -> Unit) {
    val c = CzenTheme.colors
    val context = LocalContext.current
    val numbers = listOf(R.string.safety_police to "113", R.string.safety_medical to "115", R.string.safety_fire to "114")
    Screen(stringResource(R.string.profile_safety), onBack) {
        SurfaceCard(flat = true) {
            Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text(stringResource(R.string.safety_emergency), style = CzenTheme.type.label, color = c.textSecondary, modifier = Modifier.padding(bottom = 8.dp))
                numbers.forEachIndexed { i, (res, n) ->
                    Row(
                        Modifier.fillMaxWidth().heightIn(min = 48.dp).clip(RoundedCornerShape(12.dp))
                            .clickable(role = Role.Button) { open(context, "tel:$n", Intent.ACTION_DIAL) }
                            .padding(vertical = 10.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                    ) {
                        Icon(CzenIcon.Phone, size = 18.dp, color = c.danger)
                        Text(stringResource(res), style = CzenTheme.type.label, color = c.textPrimary, modifier = Modifier.weight(1f))
                        Text(n, style = CzenTheme.type.bodyStrong, color = c.textSecondary)
                    }
                    if (i < numbers.lastIndex) Divider()
                }
            }
        }
        SurfaceCard(flat = true) {
            Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text(stringResource(R.string.safety_tips), style = CzenTheme.type.label, color = c.textSecondary)
                stringArrayResource(R.array.safety_tip_items).forEach { tip ->
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Icon(CzenIcon.ShieldCheck, size = 16.dp, color = c.success, modifier = Modifier.padding(top = 3.dp))
                        Text(tip, style = CzenTheme.type.body, color = c.textPrimary, modifier = Modifier.weight(1f))
                    }
                }
            }
        }
    }
}

@Composable
fun SupportScreen(onBack: () -> Unit, onFaq: () -> Unit) {
    val c = CzenTheme.colors
    val context = LocalContext.current
    val hotline = stringResource(R.string.support_hotline_number)
    val email = stringResource(R.string.support_email_address)
    Screen(stringResource(R.string.profile_support), onBack) {
        Text(stringResource(R.string.support_intro), style = CzenTheme.type.body, color = c.textSecondary)
        SurfaceCard(flat = true) {
            Column {
                MenuRow(CzenIcon.Phone, stringResource(R.string.support_hotline), trailing = hotline) { open(context, "tel:${hotline.replace(" ", "")}", Intent.ACTION_DIAL) }
                MenuRow(CzenIcon.Mail, stringResource(R.string.support_email), trailing = null) { open(context, "mailto:$email", Intent.ACTION_SENDTO) }
                MenuRow(CzenIcon.Help, stringResource(R.string.profile_faq), last = true, onClick = onFaq)
            }
        }
        Text(email, style = CzenTheme.type.caption, color = c.textMuted, modifier = Modifier.padding(start = 4.dp))
    }
}

@Composable
fun TermsScreen(onBack: () -> Unit) {
    val c = CzenTheme.colors
    val titles = stringArrayResource(R.array.terms_titles)
    val bodies = stringArrayResource(R.array.terms_bodies)
    Screen(stringResource(R.string.terms_title), onBack) {
        titles.forEachIndexed { i, t ->
            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text(t, style = CzenTheme.type.h2, color = c.textPrimary)
                Text(bodies[i], style = CzenTheme.type.body, color = c.textSecondary)
            }
        }
    }
}

@Composable
fun AboutScreen(onBack: () -> Unit) {
    val c = CzenTheme.colors
    Screen(stringResource(R.string.profile_about), onBack) {
        Column(Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(14.dp)) {
            com.chinhtruongba.driverapp.feature.auth.BrandTile(72.dp)
            Text(stringResource(R.string.about_title), style = CzenTheme.type.h2, color = c.textPrimary, textAlign = TextAlign.Center)
        }
        stringArrayResource(R.array.about_paragraphs).forEach {
            Text(it, style = CzenTheme.type.body, color = c.textSecondary)
        }
    }
}

/** Accordion, one item open at a time. */
@Composable
fun FaqScreen(onBack: () -> Unit) {
    val c = CzenTheme.colors
    val qs = stringArrayResource(R.array.faq_questions)
    val ans = stringArrayResource(R.array.faq_answers)
    var open by rememberSaveable { mutableIntStateOf(-1) }
    Screen(stringResource(R.string.profile_faq), onBack) {
        SurfaceCard(flat = true) {
            Column {
                qs.forEachIndexed { i, q ->
                    Column(
                        Modifier.fillMaxWidth().clickable(role = Role.Button) { open = if (open == i) -1 else i }.padding(horizontal = 16.dp, vertical = 14.dp),
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(q, style = CzenTheme.type.bodyStrong, color = c.textPrimary, modifier = Modifier.weight(1f))
                            Spacer(Modifier.size(8.dp))
                            Icon(if (open == i) CzenIcon.ChevronUp else CzenIcon.ChevronDown, size = 18.dp, color = c.textMuted)
                        }
                        AnimatedVisibility(open == i) {
                            Text(ans[i], style = CzenTheme.type.body, color = c.textSecondary, modifier = Modifier.padding(top = 8.dp))
                        }
                    }
                    if (i < qs.lastIndex) Divider()
                }
            }
        }
    }
}
