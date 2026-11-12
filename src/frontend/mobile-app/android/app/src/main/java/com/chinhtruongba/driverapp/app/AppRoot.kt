package com.chinhtruongba.driverapp.app

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.EnterTransition
import androidx.compose.animation.ExitTransition
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.navigationBars
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.material3.Text
import androidx.compose.ui.res.stringResource
import com.chinhtruongba.driverapp.R
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.unit.dp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewModelScope
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.hilt.lifecycle.viewmodel.compose.hiltViewModel
import com.chinhtruongba.driverapp.core.data.SessionRepository
import com.chinhtruongba.driverapp.core.model.ThemeMode
import com.chinhtruongba.driverapp.core.storage.PrefsStore
import com.chinhtruongba.driverapp.designsystem.components.LocalBottomBarPadding
import com.chinhtruongba.driverapp.designsystem.theme.CzenTheme
import com.chinhtruongba.driverapp.feature.auth.LandingScreen
import com.chinhtruongba.driverapp.feature.auth.LoginScreen
import com.chinhtruongba.driverapp.feature.auth.RegisterScreen
import com.chinhtruongba.driverapp.feature.earnings.EarningsScreen
import com.chinhtruongba.driverapp.feature.home.HomeScreen
import com.chinhtruongba.driverapp.feature.profile.AboutScreen
import com.chinhtruongba.driverapp.feature.profile.BankInfoScreen
import com.chinhtruongba.driverapp.feature.profile.DocumentsScreen
import com.chinhtruongba.driverapp.feature.profile.EditProfileScreen
import com.chinhtruongba.driverapp.feature.profile.FaqScreen
import com.chinhtruongba.driverapp.feature.profile.ProfileScreen
import com.chinhtruongba.driverapp.feature.profile.SafetyScreen
import com.chinhtruongba.driverapp.feature.profile.SupportScreen
import com.chinhtruongba.driverapp.feature.profile.TermsScreen
import com.chinhtruongba.driverapp.feature.profile.VehicleScreen
import com.chinhtruongba.driverapp.feature.settings.AssistantSettingsScreen
import com.chinhtruongba.driverapp.feature.trips.AddTripScreen
import com.chinhtruongba.driverapp.feature.trips.TripOfferHost
import com.chinhtruongba.driverapp.feature.trips.TripsScreen
import com.chinhtruongba.driverapp.feature.voice.ChatStore
import com.chinhtruongba.driverapp.feature.voice.VoiceSession
import com.chinhtruongba.driverapp.feature.voice.ui.AssistantChatOverlay
import com.chinhtruongba.driverapp.feature.voice.ui.AssistantOrb
import dagger.hilt.android.lifecycle.HiltViewModel
import dev.chrisbanes.haze.hazeSource
import dev.chrisbanes.haze.rememberHazeState
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import javax.inject.Inject

data class RootUiState(val ready: Boolean = false, val loggedIn: Boolean = false, val dark: Boolean = true)

@HiltViewModel
class RootViewModel @Inject constructor(
    private val session: SessionRepository,
    private val prefs: PrefsStore,
) : ViewModel() {
    val state: StateFlow<RootUiState> = combine(session.hydrated, session.loggedIn, prefs.theme) { h, l, t ->
        RootUiState(ready = h, loggedIn = l, dark = t == ThemeMode.Dark)
    }.stateIn(viewModelScope, SharingStarted.Eagerly, RootUiState())

    init {
        viewModelScope.launch { session.hydrate() }
    }
}

@HiltViewModel
class ShellViewModel @Inject constructor(
    chat: ChatStore,
    voice: VoiceSession,
    val deepLinks: DeepLinks,
) : ViewModel() {
    val panelOpen: StateFlow<Boolean> = chat.panelOpen
    val returnHome = voice.returnHome
    private val chatStore = chat
    fun closePanel() = chatStore.closePanel()
}

/** Root: blank surface until tokens are hydrated, then the (auth) or (app) stack. */
@Composable
fun AppRoot(vm: RootViewModel = hiltViewModel()) {
    val st by vm.state.collectAsStateWithLifecycle()
    val view = androidx.compose.ui.platform.LocalView.current
    LaunchedEffect(st.dark) {
        // System bar icons follow the app theme (not the system one): light icons on dark.
        val window = (view.context as? android.app.Activity)?.window ?: return@LaunchedEffect
        val ctl = androidx.core.view.WindowCompat.getInsetsController(window, view)
        ctl.isAppearanceLightStatusBars = !st.dark
        ctl.isAppearanceLightNavigationBars = !st.dark
    }
    CzenTheme(dark = st.dark) {
        Box(Modifier.fillMaxSize().background(CzenTheme.colors.background)) {
            if (st.ready) {
                if (st.loggedIn) MainShell() else AuthNav()
            }
        }
    }
}

private val pushEnter: EnterTransition = slideInHorizontally(tween(260)) { it / 4 } + fadeIn(tween(220))
private val pushExit: ExitTransition = fadeOut(tween(160))
private val popEnter: EnterTransition = fadeIn(tween(200))
private val popExit: ExitTransition = slideOutHorizontally(tween(240)) { it / 4 } + fadeOut(tween(200))

@Composable
private fun AuthNav(links: AuthLinksViewModel = hiltViewModel()) {
    val nav = rememberNavController()
    val devStatus by links.status.collectAsStateWithLifecycle()
    Box(Modifier.fillMaxSize()) {
    NavHost(
        nav,
        startDestination = Route.Landing,
        enterTransition = { pushEnter },
        exitTransition = { pushExit },
        popEnterTransition = { popEnter },
        popExitTransition = { popExit },
    ) {
        composable<Route.Landing> { LandingScreen(onLogin = { nav.navigate(Route.Login) }, onRegister = { nav.navigate(Route.Register) }) }
        composable<Route.Login> {
            LoginScreen(onBack = { nav.popBackStack() }, onRegister = {
                nav.navigate(Route.Register) { popUpTo(Route.Landing) }
            })
        }
        composable<Route.Register> {
            RegisterScreen(onBack = { nav.popBackStack() }, onLogin = {
                nav.navigate(Route.Login) { popUpTo(Route.Landing) }
            })
        }
    }
        // dev-login status line (debug / demo deep link only).
        devStatus?.let { st ->
            val text = when {
                st == "progress" -> stringResource(R.string.dev_login_progress)
                st == "missing" -> stringResource(R.string.dev_login_missing)
                else -> stringResource(R.string.dev_login_error, st.removePrefix("error:"))
            }
            Text(
                text,
                style = CzenTheme.type.caption,
                color = CzenTheme.colors.textSecondary,
                modifier = Modifier.align(Alignment.TopCenter).windowInsetsPadding(WindowInsets.statusBars).padding(top = 8.dp),
            )
        }
    }
}

@HiltViewModel
class AuthLinksViewModel @Inject constructor(links: DeepLinks) : ViewModel() {
    val status: StateFlow<String?> = links.devLoginStatus
}

private fun NavHostController.selectTab(tab: Tab) {
    navigate(tab.route()) {
        popUpTo(graph.findStartDestination().id) { saveState = true }
        launchSingleTop = true
        restoreState = true
    }
}

/** Back from hidden screens is always `replace(backTo ?? '/profile')`. */
private fun NavHostController.replaceWith(route: Route) {
    navigate(route) {
        popUpTo(graph.findStartDestination().id) { saveState = false }
        launchSingleTop = true
    }
}

@Composable
private fun MainShell(vm: ShellViewModel = hiltViewModel()) {
    val nav = rememberNavController()
    val haze = rememberHazeState()
    val panelOpen by vm.panelOpen.collectAsStateWithLifecycle()
    val entry by nav.currentBackStackEntryAsState()
    val selectedTab = tabForRoute(entry?.destination?.route)

    LaunchedEffect(Unit) {
        // useReturnHomeOnVoiceEnd
        vm.returnHome.collect { nav.selectTab(Tab.Home) }
    }
    val requested by vm.deepLinks.route.collectAsStateWithLifecycle()
    LaunchedEffect(requested) {
        val r = requested ?: return@LaunchedEffect
        vm.deepLinks.consumeRoute()
        val tab = tabForRoute(r::class.qualifiedName)
        if (r == tab?.route()) nav.selectTab(tab) else nav.navigate(r)
    }

    val navInset = with(LocalDensity.current) { WindowInsets.navigationBars.getBottom(this).toDp() }
    val barPad = TAB_BAR_HEIGHT + 10.dp + navInset + 8.dp

    Box(Modifier.fillMaxSize()) {
        CompositionLocalProvider(LocalBottomBarPadding provides barPad) {
            Box(Modifier.fillMaxSize().hazeSource(haze)) {
                NavHost(
                    nav,
                    startDestination = Route.Home,
                    enterTransition = { fadeIn(tween(200)) },
                    exitTransition = { fadeOut(tween(150)) },
                ) {
                    composable<Route.Home> { HomeScreen(onGoTrips = { nav.selectTab(Tab.Trips) }) }
                    composable<Route.Trips> { TripsScreen(onAddTrip = { nav.navigate(Route.AddTrip) }) }
                    composable<Route.Earnings> { EarningsScreen() }
                    composable<Route.Profile> { ProfileScreen(onOpen = { nav.navigate(it) }) }
                    composable<Route.AddTrip> { AddTripScreen(onDone = { nav.replaceWith(Route.Trips) }) }
                    val back = { nav.replaceWith(Route.Profile) }
                    composable<Route.EditProfile> { EditProfileScreen(onBack = back) }
                    composable<Route.Vehicle> { VehicleScreen(onBack = back) }
                    composable<Route.AssistantSettings> { AssistantSettingsScreen(onBack = back) }
                    composable<Route.BankInfo> { BankInfoScreen(onBack = back) }
                    composable<Route.Documents> { DocumentsScreen(onBack = back) }
                    composable<Route.Safety> { SafetyScreen(onBack = back) }
                    composable<Route.Support> { SupportScreen(onBack = back, onFaq = { nav.navigate(Route.Faq) }) }
                    composable<Route.Terms> { TermsScreen(onBack = back) }
                    composable<Route.About> { AboutScreen(onBack = back) }
                    composable<Route.Faq> { FaqScreen(onBack = back) }
                }
            }
        }
        // Tab bar hidden while the chat panel is open.
        AnimatedVisibility(
            visible = !panelOpen,
            modifier = Modifier.align(Alignment.BottomCenter),
            enter = slideInVertically(tween(260)) { it } + fadeIn(),
            exit = slideOutVertically(tween(220)) { it } + fadeOut(),
        ) {
            CompositionLocalProvider(com.chinhtruongba.driverapp.designsystem.glass.LocalHazeState provides haze) {
                CzenTabBar(
                    selected = selectedTab,
                    onSelect = { nav.selectTab(it) },
                    orb = { AssistantOrb(onHome = selectedTab == Tab.Home) },
                )
            }
        }
        // AssistantChatOverlay: zIndex 100
        AnimatedVisibility(
            visible = panelOpen,
            enter = slideInVertically(tween(320)) { it / 3 } + fadeIn(tween(240)),
            exit = slideOutVertically(tween(260)) { it / 3 } + fadeOut(tween(200)),
        ) {
            AssistantChatOverlay(onClose = vm::closePanel)
        }
        // TripOfferSheet: zIndex 120, always the top layer.
        CompositionLocalProvider(com.chinhtruongba.driverapp.designsystem.glass.LocalHazeState provides haze) {
            TripOfferHost()
        }
    }
}
