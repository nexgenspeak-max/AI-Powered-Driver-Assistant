package com.chinhtruongba.driverapp.feature.home

import android.content.Intent
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.core.net.toUri
import com.chinhtruongba.driverapp.R
import com.chinhtruongba.driverapp.core.util.Format
import com.chinhtruongba.driverapp.designsystem.components.CzenButton
import com.chinhtruongba.driverapp.designsystem.components.SurfaceCard
import com.chinhtruongba.driverapp.designsystem.glass.GlassKind
import com.chinhtruongba.driverapp.designsystem.glass.glass
import com.chinhtruongba.driverapp.designsystem.icons.CzenIcon
import com.chinhtruongba.driverapp.designsystem.icons.Icon
import com.chinhtruongba.driverapp.designsystem.motion.rememberReduceMotion
import com.chinhtruongba.driverapp.designsystem.theme.Brand
import com.chinhtruongba.driverapp.designsystem.theme.CzenTheme
import com.chinhtruongba.driverapp.designsystem.theme.Radii

/**
 * Map chrome sits on light Goong tiles in both themes, so its glass carries a denser tint of the
 * theme surface than the default material to keep text at ≥ 4.5:1.
 */
@Composable
private fun mapGlassTint(): Color {
    val c = CzenTheme.colors
    return if (c.isDark) c.surfaceElevated.copy(alpha = 0.78f) else Color.White.copy(alpha = 0.72f)
}

/** MapStatusPill: liquid-glass capsule with a live dot, availability and active-trip count. */
@Composable
fun MapStatusPill(online: Boolean, tripCount: Int, modifier: Modifier = Modifier) {
    val c = CzenTheme.colors
    val pulse = rememberInfiniteTransition(label = "pill")
    val s by pulse.animateFloat(1f, 1.35f, infiniteRepeatable(tween(900), RepeatMode.Reverse), label = "dot")
    val reduceMotion = rememberReduceMotion()
    Row(
        modifier
            .glass(RoundedCornerShape(50), kind = GlassKind.Lens, elevation = 12.dp, tint = mapGlassTint())
            .padding(horizontal = 14.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Box(Modifier.size(8.dp).scale(if (online && !reduceMotion) s else 1f).clip(CircleShape).background(if (online) c.success else c.textMuted))
        Text(
            stringResource(if (online) R.string.map_status_online else R.string.map_status_offline),
            style = CzenTheme.type.label,
            color = c.textPrimary,
        )
        if (online) {
            Text(stringResource(R.string.map_status_trips, tripCount), style = CzenTheme.type.label, color = c.textSecondary)
        }
    }
}

/** Recenter: 48 dp liquid-glass round button. */
@Composable
fun RecenterButton(onClick: () -> Unit, modifier: Modifier = Modifier) {
    val c = CzenTheme.colors
    val desc = stringResource(R.string.map_recenter)
    Box(
        modifier
            .size(48.dp)
            .glass(RoundedCornerShape(50), kind = GlassKind.Lens, elevation = 12.dp, tint = mapGlassTint())
            .clickable(role = Role.Button, onClick = onClick)
            .semantics { contentDescription = desc },
        contentAlignment = Alignment.Center,
    ) {
        Icon(CzenIcon.Locate, size = 22.dp, color = c.primary)
    }
}

private fun openDialer(context: android.content.Context, phone: String) {
    runCatching { context.startActivity(Intent(Intent.ACTION_DIAL, "tel:$phone".toUri()).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)) }
}

/** NextStopCard (solid card, radius 24). */
@Composable
fun NextStopCard(stop: NextStop, totalStops: Int, onNavigate: () -> Unit, modifier: Modifier = Modifier) {
    val c = CzenTheme.colors
    val context = LocalContext.current
    val accent = if (stop.isPickup) c.primary else c.success
    val kind = stringResource(
        when {
            !stop.isPickup -> R.string.next_stop_dropoff
            stop.arrived -> R.string.next_stop_arrived
            else -> R.string.next_stop_pickup
        },
    )
    val km = if (stop.distanceKm != null) Format.km(stop.distanceKm) else ""
    val min = if (stop.etaMinutes != null) Format.minutes(stop.etaMinutes) else ""
    val phone = stop.customerPhone.trim()
    val callDesc = stringResource(R.string.next_stop_call, stop.customerName.ifBlank { stringResource(R.string.next_stop_call_fallback) })
    SurfaceCard(modifier.fillMaxWidth(), radius = Radii.card, elevation = 16.dp) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                Box(Modifier.size(40.dp).clip(CircleShape).background(accent), contentAlignment = Alignment.Center) {
                    Icon(if (stop.isPickup) CzenIcon.Pin else CzenIcon.Flag, size = 20.dp, color = Color.White)
                }
                Column(Modifier.weight(1f)) {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        Text(kind, style = CzenTheme.type.label, color = c.textSecondary)
                        if (totalStops > 1) Text(stringResource(R.string.next_stop_index, totalStops), style = CzenTheme.type.caption, color = c.textMuted)
                    }
                    Text(
                        stop.customerName.ifBlank { stringResource(R.string.customer_fallback) },
                        style = CzenTheme.type.title,
                        color = c.textPrimary,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
                if (min.isNotEmpty() || km.isNotEmpty()) {
                    Column(horizontalAlignment = Alignment.End) {
                        Text(min.ifEmpty { km }, style = CzenTheme.type.bodyStrong, color = c.textPrimary)
                        if (min.isNotEmpty() && km.isNotEmpty()) Text(km, style = CzenTheme.type.caption, color = c.textSecondary)
                    }
                }
            }
            Text(stop.address, style = CzenTheme.type.body, color = c.textSecondary, maxLines = 2, overflow = TextOverflow.Ellipsis)
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                CzenButton(stringResource(R.string.next_stop_navigate), onNavigate, Modifier.weight(1f), leadingIcon = CzenIcon.Navigate)
                if (phone.isNotEmpty()) {
                    Box(
                        Modifier
                            .size(52.dp)
                            .clip(CircleShape)
                            .background(c.successContainer)
                            .clickable(role = Role.Button) { openDialer(context, phone) }
                            .semantics { contentDescription = callDesc },
                        contentAlignment = Alignment.Center,
                    ) {
                        Icon(CzenIcon.Phone, size = 22.dp, color = c.onSuccessContainer)
                    }
                }
            }
        }
    }
}

/** GoOnlineCard: today's earnings and the "Bật nhận chuyến" CTA. */
@Composable
fun GoOnlineCard(totalEarnings: Double, currency: String, tripCount: Int, loading: Boolean, onGoOnline: () -> Unit, modifier: Modifier = Modifier) {
    val c = CzenTheme.colors
    SurfaceCard(modifier.fillMaxWidth(), radius = Radii.card, elevation = 16.dp) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Row(verticalAlignment = Alignment.Bottom, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                Column(Modifier.weight(1f)) {
                    Text(stringResource(R.string.go_online_today), style = CzenTheme.type.label, color = c.textSecondary)
                    Text(Format.currency(totalEarnings, currency), style = CzenTheme.type.display, color = c.textPrimary, maxLines = 1)
                }
                Text(stringResource(R.string.go_online_trips, tripCount), style = CzenTheme.type.label, color = c.textSecondary)
            }
            CzenButton(stringResource(R.string.go_online_cta), onGoOnline, Modifier.fillMaxWidth(), loading = loading)
        }
    }
}

@Composable
private fun HudIconButton(icon: CzenIcon, desc: String, onClick: () -> Unit) {
    val c = CzenTheme.colors
    Box(
        Modifier
            .size(44.dp)
            .clip(CircleShape)
            .background(Brand.PrimaryMuted)
            .clickable(role = Role.Button, onClick = onClick)
            .semantics { contentDescription = desc },
        contentAlignment = Alignment.Center,
    ) {
        Icon(icon, size = 18.dp, color = c.primary)
    }
}

/** NavigationHud: one glass card at the top — next turn + remaining trip. */
@Composable
fun NavigationHud(nav: NavUi, onExit: () -> Unit, onRefresh: () -> Unit, modifier: Modifier = Modifier) {
    val c = CzenTheme.colors
    val step = nav.step
    val kind = maneuverKind(step?.maneuver.orEmpty())
    val icon = when {
        nav.arrived -> CzenIcon.Flag
        nav.error -> CzenIcon.Warning
        else -> when (kind) {
            ManeuverKind.UTurn -> CzenIcon.Uturn
            ManeuverKind.Roundabout -> CzenIcon.Roundabout
            ManeuverKind.Merge -> CzenIcon.Merge
            ManeuverKind.Left -> CzenIcon.TurnLeft
            ManeuverKind.Right -> CzenIcon.TurnRight
            else -> CzenIcon.Straight
        }
    }
    val action = stringResource(
        when (kind) {
            ManeuverKind.UTurn -> R.string.nav_uturn
            ManeuverKind.Roundabout -> R.string.nav_roundabout
            ManeuverKind.Merge -> R.string.nav_merge
            ManeuverKind.Left -> R.string.nav_turn_left
            ManeuverKind.Right -> R.string.nav_turn_right
            ManeuverKind.Straight -> R.string.nav_straight
            ManeuverKind.Continue -> R.string.nav_continue
        },
    )
    val dist = nav.distanceToManeuverM?.let(::formatManeuverDistance)
    val instruction = when {
        dist == null -> action
        kind == ManeuverKind.Straight -> stringResource(R.string.nav_straight_for, dist)
        kind == ManeuverKind.Continue -> stringResource(R.string.nav_continue_for, dist)
        else -> stringResource(R.string.nav_in, action, dist)
    }
    val title = when {
        nav.arrived -> stringResource(R.string.nav_arrived)
        nav.error -> stringResource(R.string.nav_error)
        nav.loading && nav.steps.isEmpty() -> stringResource(R.string.nav_loading)
        else -> instruction
    }
    val subtitle = when {
        nav.arrived || nav.error || (nav.loading && nav.steps.isEmpty()) -> null
        nav.rerouting -> stringResource(R.string.nav_rerouting)
        nav.remainingKm != null && nav.remainingMin != null ->
            stringResource(R.string.nav_remaining, "${Format.km(nav.remainingKm)} · ${Format.minutes(nav.remainingMin.toDouble())}")
        else -> null
    }
    Row(
        modifier
            .fillMaxWidth()
            .glass(RoundedCornerShape(24.dp), kind = GlassKind.Frosted, elevation = 18.dp, tint = mapGlassTint())
            .padding(horizontal = 16.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Box(Modifier.size(44.dp).clip(CircleShape).background(c.primary), contentAlignment = Alignment.Center) {
            if (nav.loading && nav.steps.isEmpty() && !nav.error) {
                CircularProgressIndicator(Modifier.size(20.dp), color = Color.White, strokeWidth = 2.dp)
            } else {
                Icon(icon, size = 22.dp, color = Color.White, strokeWidth = 2.25f)
            }
        }
        Column(Modifier.weight(1f)) {
            Text(title, style = CzenTheme.type.title, color = c.textPrimary, maxLines = 2, overflow = TextOverflow.Ellipsis)
            if (subtitle != null) Text(subtitle, style = CzenTheme.type.label, color = c.textSecondary, maxLines = 1)
        }
        if (nav.error) HudIconButton(CzenIcon.Refresh, stringResource(R.string.nav_retry), onRefresh)
        HudIconButton(CzenIcon.Close, stringResource(R.string.nav_exit), onExit)
    }
}
