package com.chinhtruongba.driverapp.feature.trips

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.onSizeChanged
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.hilt.lifecycle.viewmodel.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.chinhtruongba.driverapp.R
import com.chinhtruongba.driverapp.app.LocalPermissions
import com.chinhtruongba.driverapp.app.requestLocationForOnline
import com.chinhtruongba.driverapp.core.util.Format
import com.chinhtruongba.driverapp.designsystem.components.CzenAlert
import com.chinhtruongba.driverapp.designsystem.components.CzenToggle
import com.chinhtruongba.driverapp.designsystem.components.EmptyState
import com.chinhtruongba.driverapp.designsystem.components.LocalBottomBarPadding
import com.chinhtruongba.driverapp.designsystem.components.SearchInput
import com.chinhtruongba.driverapp.designsystem.components.SegmentedControl
import com.chinhtruongba.driverapp.designsystem.components.Skeleton
import com.chinhtruongba.driverapp.designsystem.components.SkeletonCard
import com.chinhtruongba.driverapp.designsystem.glass.LocalHazeState
import com.chinhtruongba.driverapp.designsystem.glass.glass
import com.chinhtruongba.driverapp.designsystem.icons.CzenIcon
import com.chinhtruongba.driverapp.designsystem.icons.Icon
import com.chinhtruongba.driverapp.designsystem.theme.CzenTheme
import dev.chrisbanes.haze.hazeSource
import dev.chrisbanes.haze.rememberHazeState
import androidx.compose.runtime.CompositionLocalProvider

/** Chuyến: sticky glass header (greeting, toggle, search, +, segments); only the list scrolls. */
@Composable
fun TripsScreen(onAddTrip: () -> Unit, vm: TripsViewModel = hiltViewModel()) {
    val s by vm.ui.collectAsStateWithLifecycle()
    val c = CzenTheme.colors
    val perms = LocalPermissions.current
    val haze = rememberHazeState()
    val density = LocalDensity.current
    var headerH by remember { mutableStateOf(220.dp) }
    val bottomPad = LocalBottomBarPadding.current
    val listState = androidx.compose.foundation.lazy.rememberLazyListState()
    // Each segment starts at the top; also re-anchor once the sticky header is measured.
    androidx.compose.runtime.LaunchedEffect(s.tab, headerH, s.contextLoaded) { listState.scrollToItem(0) }

    Box(Modifier.fillMaxSize().background(c.background)) {
        PullToRefreshBox(
            isRefreshing = s.refreshing,
            onRefresh = vm::pullRefresh,
            modifier = Modifier.fillMaxSize().hazeSource(haze),
        ) {
            LazyColumn(
                Modifier.fillMaxSize(),
                state = listState,
                contentPadding = PaddingValues(start = 20.dp, end = 20.dp, top = headerH + 16.dp, bottom = bottomPad + 24.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                val itemMod = Modifier.widthIn(max = 640.dp).fillMaxWidth()
                when {
                    !s.driverLoaded || (!s.contextLoaded && s.loading) -> {
                        item { SkeletonCard(itemMod) }
                        item { SkeletonCard(itemMod) }
                    }
                    s.error -> item {
                        EmptyState(
                            CzenIcon.AlertCircle,
                            stringResource(R.string.dash_error_title),
                            itemMod,
                            stringResource(R.string.dash_error_body),
                            actionLabel = stringResource(R.string.common_retry),
                            onAction = vm::retry,
                        )
                    }
                    else -> {
                        val list = when (s.tab) {
                            TripTab.Pending -> s.pending
                            TripTab.Active -> s.active
                            TripTab.Completed -> s.completed
                        }
                        val total = when (s.tab) {
                            TripTab.Pending -> s.pendingCount
                            TripTab.Active -> s.activeCount
                            TripTab.Completed -> s.completedCount
                        }
                        if (s.tab == TripTab.Active && s.optimizedRoute != null && s.query.isBlank()) {
                            item(key = "opt") { Box(itemMod) { OptimizedRouteCard(s.optimizedRoute!!) } }
                        }
                        if (list.isEmpty()) {
                            item(key = "empty") {
                                when {
                                    total > 0 && s.query.isNotBlank() ->
                                        EmptyState(CzenIcon.Search, stringResource(R.string.dash_no_match), modifier = itemMod)
                                    s.tab == TripTab.Completed ->
                                        EmptyState(CzenIcon.CheckCircle, stringResource(R.string.dash_no_completed), modifier = itemMod)
                                    s.isOnline ->
                                        EmptyState(CzenIcon.CheckCircle, stringResource(R.string.dash_empty_online_title), itemMod, stringResource(R.string.dash_empty_online_body))
                                    else ->
                                        EmptyState(CzenIcon.Power, stringResource(R.string.dash_empty_offline_title), itemMod, stringResource(R.string.dash_empty_offline_body))
                                }
                            }
                        }
                        items(list, key = { it.tripId }) { t ->
                            Box(itemMod) {
                                if (s.tab == TripTab.Pending) {
                                    TripCard(t, t.tripId in s.busyTrips, onAccept = { vm.accept(t.tripId) }, onReject = { vm.askReject(t.tripId) })
                                } else {
                                    ActiveTripCard(t, t.tripId in s.busyTrips, onAdvance = { vm.advance(t) }, onCancel = { vm.askCancel(t.tripId) })
                                }
                            }
                        }
                    }
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
                    .padding(start = 20.dp, end = 20.dp, top = 12.dp, bottom = 14.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                val m = Modifier.widthIn(max = 640.dp).fillMaxWidth()
                if (!s.driverLoaded) {
                    Skeleton(m.height(48.dp), radius = 12.dp)
                    Skeleton(m.height(44.dp), radius = 14.dp)
                    Skeleton(m.height(48.dp), radius = 14.dp)
                    return@Column
                }
                Row(m, verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                        Text(stringResource(R.string.dash_hello), style = CzenTheme.type.caption, color = c.textSecondary)
                        Text(s.driverName, style = CzenTheme.type.h1, color = c.textPrimary, maxLines = 1, overflow = TextOverflow.Ellipsis)
                        s.today?.let {
                            Text(
                                stringResource(R.string.dash_today_summary, Format.currency(it.totalEarnings, it.currency), it.tripCount),
                                style = CzenTheme.type.label,
                                color = c.textSecondary,
                                maxLines = 1,
                            )
                        }
                    }
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        Text(
                            stringResource(if (s.isOnline) R.string.dash_online_on else R.string.dash_online_off),
                            style = CzenTheme.type.label,
                            color = if (s.isOnline) c.success else c.textMuted,
                        )
                        CzenToggle(
                            checked = s.isOnline,
                            onCheckedChange = { on ->
                                if (on && perms != null) perms.requestLocationForOnline { vm.setOnline(true) } else vm.setOnline(on)
                            },
                            contentDescription = stringResource(R.string.dash_online_a11y),
                        )
                    }
                }
                Row(m, verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    SearchInput(s.query, vm::search, stringResource(R.string.dash_search), Modifier.weight(1f))
                    val addDesc = stringResource(R.string.dash_add_trip_a11y)
                    Box(
                        Modifier
                            .size(48.dp)
                            .clip(RoundedCornerShape(14.dp))
                            .background(c.primaryContainer)
                            .clickable(role = Role.Button, onClick = onAddTrip)
                            .semantics { contentDescription = addDesc },
                        contentAlignment = Alignment.Center,
                    ) { Icon(CzenIcon.Plus, size = 24.dp, color = c.onPrimaryContainer) }
                }
                SegmentedControl(
                    options = listOf(
                        stringResource(R.string.dash_seg_waiting, s.pendingCount),
                        stringResource(R.string.dash_seg_active, s.activeCount),
                        stringResource(R.string.dash_seg_done, s.completedCount),
                    ),
                    selectedIndex = s.tab.ordinal,
                    onSelect = { vm.selectTab(TripTab.entries[it]) },
                    modifier = m,
                )
            }
        }
    }

    when (val d = s.dialog) {
        is TripsDialog.ConfirmReject -> CzenAlert(
            stringResource(R.string.trip_reject_title), stringResource(R.string.trip_reject_body),
            confirmLabel = stringResource(R.string.trip_reject), onConfirm = { vm.confirmReject(d.tripId) },
            onDismiss = vm::dismissDialog, cancelLabel = stringResource(R.string.trip_reject_keep), destructive = true,
        )
        is TripsDialog.ConfirmCancel -> CzenAlert(
            stringResource(R.string.trip_cancel_title), stringResource(R.string.trip_cancel_body),
            confirmLabel = stringResource(R.string.trip_cancel), onConfirm = { vm.confirmCancel(d.tripId) },
            onDismiss = vm::dismissDialog, cancelLabel = stringResource(R.string.trip_cancel_keep), destructive = true,
        )
        is TripsDialog.ArrivalError -> CzenAlert(
            stringResource(R.string.trip_confirm_failed_title), d.detail ?: stringResource(R.string.trip_confirm_failed_body),
            confirmLabel = stringResource(R.string.common_ok), onConfirm = vm::dismissDialog, onDismiss = vm::dismissDialog,
        )
        null -> Unit
    }
}
