package com.chinhtruongba.driverapp.feature.earnings

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawWithContent
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.onSizeChanged
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.hilt.lifecycle.viewmodel.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.chinhtruongba.driverapp.R
import com.chinhtruongba.driverapp.app.LocalPermissions
import com.chinhtruongba.driverapp.core.model.Trip
import com.chinhtruongba.driverapp.core.util.Format
import com.chinhtruongba.driverapp.designsystem.components.ButtonVariant
import com.chinhtruongba.driverapp.designsystem.components.Divider
import com.chinhtruongba.driverapp.designsystem.components.EmptyState
import com.chinhtruongba.driverapp.designsystem.components.LocalBottomBarPadding
import com.chinhtruongba.driverapp.designsystem.components.SearchInput
import com.chinhtruongba.driverapp.designsystem.components.SegmentedControl
import com.chinhtruongba.driverapp.designsystem.components.Skeleton
import com.chinhtruongba.driverapp.designsystem.components.SurfaceCard
import com.chinhtruongba.driverapp.designsystem.glass.LocalHazeState
import com.chinhtruongba.driverapp.designsystem.glass.glass
import com.chinhtruongba.driverapp.designsystem.icons.CzenIcon
import com.chinhtruongba.driverapp.designsystem.icons.Icon
import com.chinhtruongba.driverapp.designsystem.theme.Brand
import com.chinhtruongba.driverapp.designsystem.theme.CzenTheme
import dev.chrisbanes.haze.hazeSource
import dev.chrisbanes.haze.rememberHazeState

private val WEEKDAY_RES = listOf(
    R.string.weekday_sun, R.string.weekday_mon, R.string.weekday_tue, R.string.weekday_wed,
    R.string.weekday_thu, R.string.weekday_fri, R.string.weekday_sat,
)

/** Thu nhập: sticky glass header (title + hero); chart and day-grouped history scroll under it. */
@Composable
fun EarningsScreen(vm: EarningsViewModel = hiltViewModel()) {
    val s by vm.ui.collectAsStateWithLifecycle()
    val c = CzenTheme.colors
    val haze = rememberHazeState()
    val density = LocalDensity.current
    var headerH by remember { mutableStateOf(300.dp) }
    val perms = LocalPermissions.current
    val listState = androidx.compose.foundation.lazy.rememberLazyListState()
    androidx.compose.runtime.LaunchedEffect(headerH, s.contextLoaded, s.period) { listState.scrollToItem(0) }

    Box(Modifier.fillMaxSize().background(c.background)) {
        LazyColumn(
            Modifier.fillMaxSize().hazeSource(haze),
            state = listState,
            contentPadding = PaddingValues(start = 20.dp, end = 20.dp, top = headerH + 20.dp, bottom = LocalBottomBarPadding.current + 24.dp),
            verticalArrangement = Arrangement.spacedBy(20.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            val m = Modifier.widthIn(max = 640.dp).fillMaxWidth()
            if (s.contextLoaded) {
                item("chart") { WeeklyChart(s.week, s.currency, m) }
                if (!s.hasCompleted) {
                    item("empty") {
                        EmptyState(
                            CzenIcon.Wallet,
                            stringResource(R.string.earn_empty_title),
                            m,
                            stringResource(if (s.isOnline) R.string.earn_empty_online else R.string.earn_empty_offline),
                            actionLabel = if (!s.isOnline && s.driverReady) stringResource(R.string.go_online_cta) else null,
                            onAction = if (!s.isOnline && s.driverReady) ({ perms?.requestLocationForOnline { vm.goOnline() } ?: vm.goOnline() }) else null,
                            actionVariant = ButtonVariant.Primary,
                        )
                    }
                } else {
                    item("search") { SearchInput(s.query, vm::search, stringResource(R.string.earn_search), m) }
                    item("history") { History(s, m) }
                }
            }
        }

        CompositionLocalProvider(LocalHazeState provides haze) {
            Column(
                Modifier
                    .onSizeChanged { headerH = with(density) { it.height.toDp() } }
                    .fillMaxWidth()
                    .glass(RoundedCornerShape(bottomStart = 28.dp, bottomEnd = 28.dp), elevation = 12.dp)
                    .windowInsetsPadding(WindowInsets.statusBars)
                    .padding(start = 20.dp, end = 20.dp, top = 16.dp, bottom = 16.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(14.dp),
            ) {
                val m = Modifier.widthIn(max = 640.dp).fillMaxWidth()
                Text(stringResource(R.string.earn_title), style = CzenTheme.type.h1, color = c.textPrimary, modifier = m)
                when {
                    s.contextLoading -> Skeleton(m.height(168.dp), radius = 24.dp)
                    s.contextError -> EmptyState(
                        CzenIcon.AlertCircle,
                        stringResource(R.string.earn_context_error_title),
                        m,
                        stringResource(R.string.earn_context_error_body),
                        actionLabel = stringResource(R.string.common_retry),
                        onAction = vm::retryContext,
                    )
                    else -> Hero(s, vm, m)
                }
            }
        }
    }
}

@Composable
private fun Hero(s: EarningsUiState, vm: EarningsViewModel, modifier: Modifier) {
    Column(modifier, verticalArrangement = Arrangement.spacedBy(14.dp)) {
        SegmentedControl(
            listOf(stringResource(R.string.earn_today), stringResource(R.string.earn_week), stringResource(R.string.earn_month)),
            s.period.ordinal,
            { vm.setPeriod(EarningsPeriod.entries[it]) },
        )
        val shape = RoundedCornerShape(24.dp)
        Column(
            Modifier
                .fillMaxWidth()
                .shadow(16.dp, shape, ambientColor = Brand.Primary, spotColor = Brand.Primary)
                .clip(shape)
                .background(Brush.linearGradient(listOf(Brand.Deep, Brand.PrimaryPress, Brand.GradientEnd)))
                .drawWithContent {
                    drawContent()
                    drawRect(Brush.radialGradient(listOf(Color.White.copy(alpha = 0.22f), Color.Transparent), center = androidx.compose.ui.geometry.Offset(size.width * 0.9f, 0f), radius = size.width * 0.7f))
                }
                .border(1.dp, Brush.verticalGradient(listOf(Color.White.copy(alpha = 0.4f), Color.Transparent)), shape)
                .padding(18.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            when {
                s.totalsError -> Text(
                    stringResource(R.string.earn_error_tap),
                    style = CzenTheme.type.body,
                    color = Color.White.copy(alpha = 0.85f),
                    modifier = Modifier.fillMaxWidth().clickable(role = Role.Button, onClick = vm::retryTotals).padding(vertical = 12.dp),
                )
                s.totalsLoading || s.total == null -> Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Skeleton(Modifier.width(200.dp).height(34.dp))
                    Skeleton(Modifier.width(140.dp).height(14.dp))
                }
                else -> {
                    Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                        Text(stringResource(R.string.earn_total), style = CzenTheme.type.label, color = Color.White.copy(alpha = 0.8f))
                        Text(Format.currency(s.total, s.currency), style = CzenTheme.type.display.copy(fontSize = CzenTheme.type.display.fontSize * 1.15f), color = Color.White, maxLines = 1)
                    }
                    Box(Modifier.fillMaxWidth().height(1.dp).background(Color.White.copy(alpha = 0.18f)))
                    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        val count = s.tripCount ?: 0
                        Stat(stringResource(R.string.earn_trips), count.toString(), Modifier.weight(1f))
                        Stat(stringResource(R.string.earn_avg), if (count > 0) Format.currency(s.total / count, s.currency) else "—", Modifier.weight(1f))
                        when {
                            s.hoursOnline != null -> Stat(stringResource(R.string.earn_hours), stringResource(R.string.earn_hours_value, Format.hours(s.hoursOnline)), Modifier.weight(1f))
                            s.bonus != null -> Stat(stringResource(R.string.earn_bonus), Format.currency(s.bonus, s.currency), Modifier.weight(1f))
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun Stat(label: String, value: String, modifier: Modifier) {
    Column(modifier, verticalArrangement = Arrangement.spacedBy(2.dp)) {
        Text(label, style = CzenTheme.type.caption, color = Color.White.copy(alpha = 0.75f), maxLines = 1)
        Text(value, style = CzenTheme.type.title, color = Color.White, maxLines = 1, overflow = TextOverflow.Ellipsis)
    }
}

@Composable
private fun WeeklyChart(days: List<DayBucket>, currency: String, modifier: Modifier) {
    val c = CzenTheme.colors
    val max = maxOf(1.0, days.maxOfOrNull { it.total } ?: 0.0)
    val best = days.maxByOrNull { it.total }
    SurfaceCard(modifier) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
            Row(verticalAlignment = Alignment.Bottom) {
                Text(stringResource(R.string.earn_chart_title), style = CzenTheme.type.h2, color = c.textPrimary, modifier = Modifier.weight(1f))
                Text(
                    if (best != null && best.total > 0) stringResource(R.string.earn_chart_best, stringResource(WEEKDAY_RES[best.dayOfWeek]), Format.currency(best.total, currency))
                    else stringResource(R.string.earn_chart_empty),
                    style = CzenTheme.type.caption,
                    color = c.textSecondary,
                )
            }
            Row(Modifier.fillMaxWidth().height(116.dp), horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.Bottom) {
                days.forEach { d ->
                    val target = if (d.total > 0) maxOf(6f, (d.total / max * 88).toFloat()) else 4f
                    val h by animateFloatAsState(target, tween(500), label = "bar")
                    Column(Modifier.weight(1f).fillMaxHeight(), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Bottom) {
                        Box(
                            Modifier
                                .fillMaxWidth()
                                .height(h.dp)
                                .clip(RoundedCornerShape(8.dp))
                                .background(
                                    when {
                                        d.isToday -> Brush.verticalGradient(listOf(Brand.GradientEnd, Brand.PrimaryPress))
                                        d.total > 0 -> Brush.verticalGradient(listOf(c.primaryContainer, c.primaryContainer))
                                        else -> Brush.verticalGradient(listOf(c.chip, c.chip))
                                    },
                                ),
                        )
                        Text(
                            stringResource(WEEKDAY_RES[d.dayOfWeek]),
                            style = CzenTheme.type.caption,
                            color = if (d.isToday) c.primary else c.textMuted,
                            modifier = Modifier.padding(top = 6.dp),
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun History(s: EarningsUiState, modifier: Modifier) {
    val c = CzenTheme.colors
    val q = s.query.trim()
    Column(modifier, verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Row(verticalAlignment = Alignment.Bottom) {
            Text(stringResource(R.string.earn_history), style = CzenTheme.type.h2, color = c.textPrimary, modifier = Modifier.weight(1f))
            val caption = when {
                q.isNotEmpty() && s.visibleCount > 0 -> stringResource(R.string.earn_caption_match, s.visibleCount, s.periodCount, q)
                q.isEmpty() && s.truncated -> stringResource(R.string.earn_caption_recent, s.periodCount, s.tripCount ?: 0)
                else -> null
            }
            caption?.let { Text(it, style = CzenTheme.type.caption, color = c.textSecondary) }
        }
        if (s.groups.isEmpty()) {
            Text(
                if (q.isNotEmpty()) stringResource(R.string.earn_no_match, q) else stringResource(R.string.earn_empty_period),
                style = CzenTheme.type.body,
                color = c.textSecondary,
            )
        }
        s.groups.forEach { g ->
            SurfaceCard {
                Column {
                    Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 12.dp), verticalAlignment = Alignment.CenterVertically) {
                        Text(headingText(g.heading), style = CzenTheme.type.label, color = c.textSecondary, modifier = Modifier.weight(1f))
                        Text(Format.currency(g.total, s.currency), style = CzenTheme.type.bodyStrong, color = c.textPrimary)
                    }
                    Divider()
                    g.trips.forEachIndexed { i, t ->
                        TripRow(t)
                        if (i < g.trips.lastIndex) Divider(Modifier.padding(start = 64.dp))
                    }
                }
            }
        }
    }
}

@Composable
private fun headingText(h: DayHeading): String = when (h) {
    DayHeading.Today -> stringResource(R.string.earn_today)
    DayHeading.Yesterday -> stringResource(R.string.earn_yesterday)
    is DayHeading.Date -> Format.weekdayDate(h.date)
    DayHeading.Other -> "—"
}

@Composable
private fun TripRow(t: Trip) {
    val c = CzenTheme.colors
    Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 12.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
        Box(Modifier.size(36.dp).clip(CircleShape).background(c.successContainer), contentAlignment = Alignment.Center) {
            Icon(CzenIcon.Check, size = 18.dp, color = c.onSuccessContainer)
        }
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
            Text(t.customerName.ifBlank { stringResource(R.string.customer_fallback) }, style = CzenTheme.type.bodyStrong, color = c.textPrimary, maxLines = 1, overflow = TextOverflow.Ellipsis)
            val whenIso = t.updatedAt.ifBlank { t.pickupTime.ifBlank { t.createdAt } }
            val parts = buildList {
                add(Format.time(whenIso))
                t.distanceKm?.takeIf { it > 0 }?.let { add(Format.km(it)) }
                add(t.dropoffAddress)
            }
            Text(parts.joinToString(" · "), style = CzenTheme.type.caption, color = c.textSecondary, maxLines = 1, overflow = TextOverflow.Ellipsis)
        }
        Text(Format.currency(t.estimatedFare ?: 0.0), style = CzenTheme.type.title, color = c.textPrimary)
    }
}
