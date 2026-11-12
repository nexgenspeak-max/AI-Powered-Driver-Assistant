package com.chinhtruongba.driverapp.feature.trips

import androidx.compose.animation.animateContentSize
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.core.net.toUri
import com.chinhtruongba.driverapp.R
import com.chinhtruongba.driverapp.core.model.OptimizedRoute
import com.chinhtruongba.driverapp.core.model.Trip
import com.chinhtruongba.driverapp.core.model.TripStatus
import com.chinhtruongba.driverapp.core.util.Format
import com.chinhtruongba.driverapp.designsystem.components.Badge
import com.chinhtruongba.driverapp.designsystem.components.ButtonVariant
import com.chinhtruongba.driverapp.designsystem.components.CzenButton
import com.chinhtruongba.driverapp.designsystem.components.Divider
import com.chinhtruongba.driverapp.designsystem.components.RouteLine
import com.chinhtruongba.driverapp.designsystem.components.SurfaceCard
import com.chinhtruongba.driverapp.designsystem.icons.CzenIcon
import com.chinhtruongba.driverapp.designsystem.icons.Icon
import com.chinhtruongba.driverapp.designsystem.theme.BadgeTone
import com.chinhtruongba.driverapp.designsystem.theme.CzenTheme

fun TripStatus.labelRes(): Int = when (this) {
    TripStatus.Pending -> R.string.status_pending
    TripStatus.Notified -> R.string.status_notified
    TripStatus.Calling -> R.string.status_calling
    TripStatus.Confirmed -> R.string.status_confirmed
    TripStatus.Rejected -> R.string.status_rejected
    TripStatus.NoAnswer -> R.string.status_no_answer
    TripStatus.ArrivedPickup -> R.string.status_arrived_pickup
    TripStatus.PickedUp -> R.string.status_picked_up
    TripStatus.Completed, TripStatus.Unknown -> R.string.status_completed
    TripStatus.Cancelled -> R.string.status_cancelled
    TripStatus.CancelledByDriver -> R.string.status_cancelled_by_driver
    TripStatus.NoShow -> R.string.status_no_show
}

fun TripStatus.tone(): BadgeTone = when (this) {
    TripStatus.Pending -> BadgeTone.Yellow
    TripStatus.Notified -> BadgeTone.Blue
    TripStatus.Calling -> BadgeTone.Purple
    TripStatus.Confirmed -> BadgeTone.Green
    TripStatus.Rejected, TripStatus.Cancelled, TripStatus.CancelledByDriver, TripStatus.NoShow -> BadgeTone.Red
    TripStatus.NoAnswer -> BadgeTone.Orange
    TripStatus.ArrivedPickup, TripStatus.PickedUp -> BadgeTone.Pink
    TripStatus.Completed, TripStatus.Unknown -> BadgeTone.Gray
}

@Composable
fun StatusBadge(status: TripStatus) = Badge(stringResource(status.labelRes()), status.tone())

/** Distance · driving time · pickup slot · congestion note (warning unless "thông thoáng"). */
@Composable
fun TripMetaRow(distanceKm: Double?, etaMinutes: Double?, pickupTime: String?, trafficNote: String?, modifier: Modifier = Modifier) {
    val c = CzenTheme.colors
    val clearMarker = stringResource(R.string.trip_traffic_clear_marker)
    val congestion = trafficNote?.takeIf { it.isNotBlank() && !it.contains(clearMarker, ignoreCase = true) }
    val items = buildList {
        if (distanceKm != null && distanceKm > 0) add(Triple(CzenIcon.Distance, Format.km(distanceKm), false))
        if (etaMinutes != null && etaMinutes > 0) add(Triple(CzenIcon.Clock, Format.minutes(etaMinutes), false))
        if (!pickupTime.isNullOrBlank()) add(Triple(CzenIcon.Calendar, Format.time(pickupTime), false))
        if (congestion != null) add(Triple(CzenIcon.Warning, congestion, true))
    }
    if (items.isEmpty()) return
    FlowRow(modifier, horizontalArrangement = Arrangement.spacedBy(12.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
        items.forEach { (icon, text, warn) ->
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                Icon(icon, size = 14.dp, color = if (warn) c.warning else c.textMuted)
                Text(text, style = CzenTheme.type.label, color = if (warn) c.warning else c.textSecondary, maxLines = 1)
            }
        }
    }
}

@Composable
private fun TripHeader(trip: Trip, avatarBg: Color, avatarFg: Color, trailing: @Composable () -> Unit) {
    val c = CzenTheme.colors
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
        Box(Modifier.size(44.dp).clip(CircleShape).background(avatarBg), contentAlignment = Alignment.Center) {
            Text(trip.customerName.trim().firstOrNull()?.uppercase() ?: "K", style = CzenTheme.type.title, color = avatarFg)
        }
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
            Text(trip.customerName.ifBlank { stringResource(R.string.customer_fallback) }, style = CzenTheme.type.title, color = c.textPrimary, maxLines = 1, overflow = TextOverflow.Ellipsis)
            Text(trip.customerPhone, style = CzenTheme.type.caption, color = c.textSecondary, maxLines = 1)
        }
        trailing()
    }
}

@Composable
private fun Fare(trip: Trip) {
    trip.estimatedFare?.let {
        Text(Format.currency(it), style = CzenTheme.type.title, color = CzenTheme.colors.textPrimary)
    }
}

/** Pending/notified card with Từ chối / Nhận chuyến for notified|calling. */
@Composable
fun TripCard(trip: Trip, busy: Boolean, onAccept: () -> Unit, onReject: () -> Unit) {
    val c = CzenTheme.colors
    SurfaceCard {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
            TripHeader(trip, c.primaryContainer, c.onPrimaryContainer) {
                Column(horizontalAlignment = Alignment.End, verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    StatusBadge(trip.status)
                    Fare(trip)
                }
            }
            RouteLine(trip.pickupAddress, trip.dropoffAddress)
            TripMetaRow(trip.distanceKm, trip.etaMinutes, trip.pickupTime, trip.trafficNote)
            if (trip.status == TripStatus.Notified || trip.status == TripStatus.Calling) {
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    CzenButton(stringResource(R.string.trip_reject), onReject, Modifier.weight(1f), variant = ButtonVariant.Outline, enabled = !busy)
                    CzenButton(stringResource(R.string.trip_accept), onAccept, Modifier.weight(1f), loading = busy)
                }
            }
        }
    }
}

/** Đã nhận → Đã đến → Đã đón. */
@Composable
fun TripProgressStepper(status: TripStatus) {
    val c = CzenTheme.colors
    val reached = when (status) {
        TripStatus.Confirmed -> 1
        TripStatus.ArrivedPickup -> 2
        TripStatus.PickedUp, TripStatus.Completed -> 3
        else -> 0
    }
    val labels = listOf(R.string.trip_step_accepted, R.string.trip_step_arrived, R.string.trip_step_picked)
    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
        labels.forEachIndexed { i, res ->
            val done = i < reached
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                Box(
                    Modifier.size(22.dp).clip(CircleShape).background(if (done) c.success else c.surfaceVariant),
                    contentAlignment = Alignment.Center,
                ) {
                    if (done) Icon(CzenIcon.Check, size = 14.dp, color = Color.White, strokeWidth = 2.4f)
                    else Text("${i + 1}", style = CzenTheme.type.caption, color = c.textMuted)
                }
                Text(stringResource(res), style = CzenTheme.type.label, color = if (done) c.textPrimary else c.textMuted, maxLines = 1)
            }
            if (i < labels.lastIndex) {
                Box(
                    Modifier
                        .weight(1f)
                        .padding(horizontal = 6.dp)
                        .height(2.dp)
                        .clip(RoundedCornerShape(1.dp))
                        .background(if (i + 1 < reached) c.success else c.border),
                )
            }
        }
    }
}

/** Active/completed card: stepper, route, meta, flags, next action, call, cancel. */
@Composable
fun ActiveTripCard(trip: Trip, busy: Boolean, onAdvance: () -> Unit, onCancel: () -> Unit) {
    val c = CzenTheme.colors
    val context = LocalContext.current
    SurfaceCard {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
            TripHeader(trip, c.successContainer, c.onSuccessContainer) { Fare(trip) }
            TripProgressStepper(trip.status)
            RouteLine(trip.pickupAddress, trip.dropoffAddress)
            TripMetaRow(trip.distanceKm, trip.etaMinutes, trip.pickupTime, trip.trafficNote)
            val flags = listOfNotNull(
                stringResource(R.string.trip_flag_bulky).takeIf { trip.hasBulkyGoods == true },
                stringResource(R.string.trip_flag_children).takeIf { trip.withChildren == true },
            )
            if (flags.isNotEmpty()) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    Icon(CzenIcon.Info, size = 16.dp, color = c.warning)
                    Text(flags.joinToString(" · "), style = CzenTheme.type.label, color = c.warning)
                }
            }
            val (label, variant) = when (trip.status) {
                TripStatus.Confirmed -> R.string.trip_action_arrived to ButtonVariant.Primary
                TripStatus.ArrivedPickup -> R.string.trip_action_picked to ButtonVariant.Primary
                TripStatus.PickedUp -> R.string.trip_action_complete to ButtonVariant.Success
                else -> R.string.trip_action_done to ButtonVariant.Outline
            }
            val completed = trip.status == TripStatus.Completed
            CzenButton(stringResource(label), onAdvance, Modifier.fillMaxWidth(), variant = variant, enabled = !completed, loading = busy)
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                CzenButton(
                    stringResource(R.string.trip_call_customer),
                    { dial(context, trip.customerPhone) },
                    Modifier.weight(1f),
                    variant = ButtonVariant.Outline,
                    leadingIcon = CzenIcon.Phone,
                )
                if (trip.status != TripStatus.PickedUp && !completed) {
                    CzenButton(stringResource(R.string.trip_cancel), onCancel, Modifier.weight(1f), variant = ButtonVariant.Outline, enabled = !busy)
                }
            }
        }
    }
}

fun dial(context: android.content.Context, phone: String) {
    runCatching {
        context.startActivity(android.content.Intent(android.content.Intent.ACTION_DIAL, "tel:$phone".toUri()).addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK))
    }
}

/** "Lộ trình tối ưu" — numbered stops, collapsed by default; hidden under 2 stops. */
@Composable
fun OptimizedRouteCard(route: OptimizedRoute) {
    val c = CzenTheme.colors
    val stops = route.stops
    if (stops.size < 2) return
    var expanded by rememberSaveable { mutableStateOf(false) }
    val totalM = route.totalDistanceM ?: stops.sumOf { it.distanceM }
    val totalMin = route.totalDurationS?.let { Math.round(it / 60.0).toDouble() } ?: stops.sumOf { it.etaMinutes }
    val basis = stringResource(if (route.costBasis == "distance") R.string.opt_shortest else R.string.opt_fastest)
    SurfaceCard(Modifier.animateContentSize()) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                Box(Modifier.size(36.dp).clip(RoundedCornerShape(12.dp)).background(c.primaryContainer), contentAlignment = Alignment.Center) {
                    Icon(CzenIcon.Route, size = 20.dp, color = c.onPrimaryContainer)
                }
                Column(Modifier.weight(1f)) {
                    Text(stringResource(R.string.opt_title), style = CzenTheme.type.title, color = c.textPrimary)
                    Text(
                        stringResource(R.string.opt_summary, stops.size, Format.km(totalM / 1000), Format.minutes(totalMin), basis),
                        style = CzenTheme.type.caption,
                        color = c.textSecondary,
                    )
                }
            }
            if (route.source == "haversine_fallback") {
                Text(stringResource(R.string.opt_fallback), style = CzenTheme.type.caption, color = c.warning)
            }
            val visible = if (expanded) stops else stops.take(2)
            Column(verticalArrangement = Arrangement.spacedBy(0.dp)) {
                visible.forEachIndexed { i, s ->
                    if (i > 0) Divider(Modifier.padding(vertical = 8.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.Top) {
                        Box(
                            Modifier.size(26.dp).clip(CircleShape).background(if (s.isPickup) c.primary else c.success),
                            contentAlignment = Alignment.Center,
                        ) { Text("${i + 1}", style = CzenTheme.type.label, color = Color.White) }
                        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                            Text(
                                stringResource(if (s.isPickup) R.string.opt_pickup else R.string.opt_dropoff, s.customerName.ifBlank { stringResource(R.string.customer_fallback) }),
                                style = CzenTheme.type.bodyStrong,
                                color = c.textPrimary,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis,
                            )
                            Text(s.address, style = CzenTheme.type.caption, color = c.textSecondary, maxLines = 2, overflow = TextOverflow.Ellipsis)
                            Text(
                                if (i == 0 && route.driverLocation == null) stringResource(R.string.opt_origin_no_gps)
                                else listOf(Format.km(s.distanceM / 1000), Format.minutes(s.etaMinutes)).joinToString(" · "),
                                style = CzenTheme.type.caption,
                                color = c.textMuted,
                            )
                        }
                    }
                }
            }
            if (stops.size > 2) {
                Row(
                    Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(12.dp))
                        .clickable(role = Role.Button) { expanded = !expanded }
                        .padding(vertical = 10.dp),
                    horizontalArrangement = Arrangement.Center,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        if (expanded) stringResource(R.string.opt_collapse) else stringResource(R.string.opt_show_all, stops.size),
                        style = CzenTheme.type.label,
                        color = c.primary,
                    )
                    Spacer(Modifier.width(4.dp))
                    Icon(if (expanded) CzenIcon.ChevronUp else CzenIcon.ChevronDown, size = 16.dp, color = c.primary)
                }
            }
        }
    }
}
