package com.chinhtruongba.driverapp.feature.home

import android.Manifest
import android.app.Activity
import android.content.Context
import android.content.ContextWrapper
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.unit.dp
import androidx.core.view.WindowCompat
import androidx.hilt.lifecycle.viewmodel.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.chinhtruongba.driverapp.app.LocalPermissions
import com.chinhtruongba.driverapp.designsystem.components.LocalBottomBarPadding
import com.chinhtruongba.driverapp.designsystem.glass.LocalHazeState
import dev.chrisbanes.haze.hazeSource
import dev.chrisbanes.haze.rememberHazeState

private const val FINE = Manifest.permission.ACCESS_FINE_LOCATION
private const val COARSE = Manifest.permission.ACCESS_COARSE_LOCATION
private const val BACKGROUND = Manifest.permission.ACCESS_BACKGROUND_LOCATION

/** Extra clearance for the Czen orb, which rises ~28 dp above the floating tab bar. */
private val ORB_CLEARANCE = 30.dp

private tailrec fun Context.findActivity(): Activity? = when (this) {
    is Activity -> this
    is ContextWrapper -> baseContext.findActivity()
    else -> null
}

/** Home: full-bleed map with the glass status pill, recenter, next-stop / go-online card and HUD. */
@Composable
fun HomeScreen(onGoTrips: () -> Unit, vm: HomeViewModel = hiltViewModel()) {
    val state by vm.state.collectAsStateWithLifecycle()
    val permissions = LocalPermissions.current
    val mapHaze = rememberHazeState()
    val bottomPad = LocalBottomBarPadding.current + ORB_CLEARANCE

    // Goong tiles are light in both themes: dark status-bar icons while Home is shown.
    val view = LocalView.current
    DisposableEffect(view) {
        val window = view.context.findActivity()?.window
        val ctl = window?.let { WindowCompat.getInsetsController(it, view) }
        val prev = ctl?.isAppearanceLightStatusBars
        ctl?.isAppearanceLightStatusBars = true
        onDispose { if (ctl != null && prev != null) ctl.isAppearanceLightStatusBars = prev }
    }

    // The map needs the driver's position: ask in context, then start the watch.
    LaunchedEffect(permissions) {
        val p = permissions ?: return@LaunchedEffect
        if (p.granted(FINE) || p.granted(COARSE)) vm.startUpdates()
        else p.request(arrayOf(FINE, COARSE)) { ok -> if (ok) vm.startUpdates() }
    }

    val goOnline = {
        val p = permissions
        if (p == null) {
            vm.goOnline()
        } else {
            // Location when going online: foreground first, then background (Android 10+ asks separately).
            p.request(arrayOf(FINE, COARSE)) { fg ->
                if (fg) {
                    vm.startUpdates()
                    p.request(arrayOf(BACKGROUND)) { vm.goOnline() }
                } else {
                    vm.goOnline()
                }
            }
        }
    }

    Box(Modifier.fillMaxSize()) {
        DriverMap(
            state = state,
            fitPaddingTop = 100.dp,
            fitPaddingBottom = if (state.nextStop != null || (state.hasContext && !state.online)) 260.dp else 60.dp,
            modifier = Modifier.fillMaxSize().hazeSource(mapHaze),
        )
        CompositionLocalProvider(LocalHazeState provides mapHaze) {
            val top = Modifier
                .align(Alignment.TopCenter)
                .windowInsetsPadding(WindowInsets.statusBars)
                .padding(horizontal = 16.dp, vertical = 12.dp)
                .widthIn(max = 640.dp)
                .fillMaxWidth()
            if (state.nav.active) {
                NavigationHud(state.nav, onExit = vm::exitNavigation, onRefresh = vm::refreshRoute, modifier = top)
            } else {
                Row(top, verticalAlignment = Alignment.CenterVertically) {
                    MapStatusPill(state.online, state.activeTripCount)
                    Box(Modifier.weight(1f))
                    RecenterButton(vm::recenter)
                }
            }
            val bottom = Modifier
                .align(Alignment.BottomCenter)
                .padding(start = 16.dp, end = 16.dp, bottom = bottomPad)
                .widthIn(max = 640.dp)
                .fillMaxWidth()
            val next = state.nextStop
            AnimatedVisibility(
                visible = !state.nav.active && (next != null || (state.hasContext && !state.online)),
                modifier = bottom,
                enter = slideInVertically { it / 2 } + fadeIn(),
                exit = slideOutVertically { it / 2 } + fadeOut(),
            ) {
                if (next != null) {
                    NextStopCard(next, state.totalStops, onNavigate = vm::startNavigation)
                } else {
                    val today = state.today
                    GoOnlineCard(
                        totalEarnings = today?.totalEarnings ?: 0.0,
                        currency = today?.currency ?: "VND",
                        tripCount = today?.tripCount ?: 0,
                        loading = state.goingOnline,
                        onGoOnline = goOnline,
                    )
                }
            }
        }
    }
}
