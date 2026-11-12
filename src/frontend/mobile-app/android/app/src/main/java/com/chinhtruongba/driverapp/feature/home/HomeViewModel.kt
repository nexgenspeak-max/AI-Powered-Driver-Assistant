package com.chinhtruongba.driverapp.feature.home

import androidx.compose.ui.graphics.toArgb
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.chinhtruongba.driverapp.core.data.DriverRepository
import com.chinhtruongba.driverapp.core.model.DriverContext
import com.chinhtruongba.driverapp.core.model.LatLng
import com.chinhtruongba.driverapp.core.model.RouteStep
import com.chinhtruongba.driverapp.core.model.TodayEarnings
import com.chinhtruongba.driverapp.core.model.TripStatus
import com.chinhtruongba.driverapp.core.util.Geo
import com.chinhtruongba.driverapp.core.util.LiveLeg
import com.chinhtruongba.driverapp.core.util.NavigationMath
import com.chinhtruongba.driverapp.core.util.Polyline
import com.chinhtruongba.driverapp.designsystem.theme.Brand
import com.chinhtruongba.driverapp.feature.location.Fix
import com.chinhtruongba.driverapp.feature.location.LocationSource
import com.chinhtruongba.driverapp.feature.location.LocationTracker
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.util.Locale
import javax.inject.Inject

/** The stop the NextStopCard and the navigation target point at (useDriverMapModel.nextStop). */
data class NextStop(
    val isPickup: Boolean,
    val customerName: String,
    val customerPhone: String,
    val address: String,
    val latLng: LatLng,
    val distanceKm: Double?,
    val etaMinutes: Double?,
    val arrived: Boolean,
)

/** A pickup or dropoff marker in its trip colour, with its position in the optimized order. */
data class MapStop(
    val key: String,
    val isPickup: Boolean,
    val latLng: LatLng,
    val color: Int,
    val name: String,
    val order: Int?,
)

/** useTurnByTurnNavigation state. */
data class NavUi(
    val active: Boolean = false,
    val loading: Boolean = false,
    val error: Boolean = false,
    val rerouting: Boolean = false,
    val steps: List<RouteStep> = emptyList(),
    val stepIndex: Int = 0,
    val path: List<LatLng> = emptyList(),
    val distanceToManeuverM: Double? = null,
    val remainingKm: Double? = null,
    val remainingMin: Int? = null,
) {
    val arrived: Boolean get() = steps.isNotEmpty() && stepIndex >= steps.size
    val step: RouteStep? get() = steps.getOrNull(stepIndex)
}

data class HomeUiState(
    val hasContext: Boolean = false,
    val online: Boolean = false,
    val activeTripCount: Int = 0,
    val today: TodayEarnings? = null,
    /** Live GPS fix, else the server's `current_location`. */
    val driver: LatLng? = null,
    val heading: Float? = null,
    val hasLiveFix: Boolean = false,
    val stops: List<MapStop> = emptyList(),
    val routeLine: List<LatLng> = emptyList(),
    val nextStop: NextStop? = null,
    val totalStops: Int = 0,
    val nav: NavUi = NavUi(),
    val goingOnline: Boolean = false,
    val recenterTick: Int = 0,
)

/** RN `formatManeuverDistance`: "1.2 km" ≥ 1 km, else rounded to 10 m (min 10). */
fun formatManeuverDistance(meters: Double): String =
    if (meters >= 1000) String.format(Locale.US, "%.1f km", meters / 1000) else "${maxOf(10L, Math.round(meters / 10) * 10)} m"

enum class ManeuverKind { UTurn, Roundabout, Merge, Left, Right, Straight, Continue }

/** Substring match on Goong/Google maneuver vocabularies; category checks before left/right. */
fun maneuverKind(maneuver: String): ManeuverKind {
    val m = maneuver.lowercase()
    return when {
        "uturn" in m -> ManeuverKind.UTurn
        "roundabout" in m -> ManeuverKind.Roundabout
        "merge" in m || "fork" in m || "ramp" in m -> ManeuverKind.Merge
        "left" in m -> ManeuverKind.Left
        "right" in m -> ManeuverKind.Right
        "straight" in m || "continue" in m -> ManeuverKind.Straight
        else -> ManeuverKind.Continue
    }
}

private const val ARRIVED_HUD_MS = 4_000L

@HiltViewModel
class HomeViewModel @Inject constructor(
    private val drivers: DriverRepository,
    private val location: LocationSource,
    private val tracker: LocationTracker,
) : ViewModel() {
    private val fix = MutableStateFlow(location.last.value)
    private val nav = MutableStateFlow(NavUi())
    private val goingOnline = MutableStateFlow(false)
    private val recenterTick = MutableStateFlow(0)

    private var updatesJob: Job? = null
    private var fetchJob: Job? = null
    private var arrivedJob: Job? = null
    private var fetchedFor: String? = null
    private var offRouteTicks = 0
    private var lastRerouteAt = 0L
    private var target: LatLng? = null

    val state: StateFlow<HomeUiState> = combine(drivers.context, fix, nav, goingOnline, recenterTick) { ctxL, f, n, going, tick ->
        build(ctxL.data, f, n, going, tick)
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), HomeUiState())

    init {
        viewModelScope.launch { location.last.collect { it?.let(::onFix) } }
        startUpdates()
        drivers.ensureFresh()
        // The navigation target follows the next stop; losing it ends navigation.
        viewModelScope.launch {
            state.collect { s ->
                val t = s.nextStop?.latLng
                target = t
                if (nav.value.active) {
                    if (t == null) exitNavigation() else maybeFetch()
                }
            }
        }
    }

    /** (Re)starts the 3 s / 5 m watch — call again after the location permission is granted. */
    fun startUpdates() {
        if (updatesJob?.isActive == true) return
        if (!location.hasForegroundPermission()) return
        updatesJob = viewModelScope.launch { location.updates(3_000, 5f).collect(::onFix) }
    }

    fun recenter() = recenterTick.update { it + 1 }

    fun goOnline() {
        if (goingOnline.value) return
        goingOnline.value = true
        viewModelScope.launch {
            try {
                drivers.setOnline(true)
            } catch (e: CancellationException) {
                throw e
            } catch (_: Exception) {
                // rolled back by the repository
            } finally {
                goingOnline.value = false
            }
        }
    }

    fun startNavigation() {
        tracker.pushImmediate()
        fetchedFor = null
        offRouteTicks = 0
        nav.value = NavUi(active = true)
        maybeFetch()
    }

    fun exitNavigation() {
        fetchJob?.cancel()
        arrivedJob?.cancel()
        fetchedFor = null
        offRouteTicks = 0
        nav.value = NavUi()
    }

    fun refreshRoute() = fetch(reroute = false)

    private fun onFix(f: Fix) {
        fix.value = f
        val n = nav.value
        if (!n.active) return
        maybeFetch()
        if (n.steps.isEmpty()) return
        val origin = f.latLng
        val idx = NavigationMath.advanceStepIndex(origin, n.steps, n.stepIndex)
        if (idx >= n.steps.size) {
            nav.value = n.copy(stepIndex = idx, distanceToManeuverM = null, remainingKm = 0.0, remainingMin = 0)
            if (arrivedJob?.isActive != true) {
                arrivedJob = viewModelScope.launch {
                    delay(ARRIVED_HUD_MS)
                    exitNavigation()
                }
            }
            return
        }
        val tick = NavigationMath.offRouteTick(origin, n.path, offRouteTicks, lastRerouteAt, System.currentTimeMillis())
        offRouteTicks = tick.ticks
        val rem = NavigationMath.remainingFromPosition(origin, n.steps, idx)
        nav.value = n.copy(
            stepIndex = idx,
            distanceToManeuverM = Geo.distanceMeters(origin, n.steps[idx].endLocation),
            remainingKm = rem?.km,
            remainingMin = rem?.min,
        )
        if (tick.shouldReroute) {
            lastRerouteAt = System.currentTimeMillis()
            fetch(reroute = true)
        }
    }

    private fun key(t: LatLng) = String.format(Locale.US, "%.5f,%.5f", t.lat, t.lng)

    /** Fetch GET /drivers/me/navigation once per destination. */
    private fun maybeFetch() {
        val t = target ?: return
        if (fix.value == null) return
        val k = key(t)
        if (fetchedFor == k) return
        fetchedFor = k
        fetch(reroute = false)
    }

    private fun fetch(reroute: Boolean) {
        val from = fix.value?.latLng ?: return
        val to = target ?: return
        if (fetchJob?.isActive == true) return
        nav.update { if (reroute) it.copy(rerouting = true) else it.copy(loading = true, error = false) }
        fetchJob = viewModelScope.launch {
            try {
                val route = drivers.navigation(from, to)
                offRouteTicks = 0
                val rem = NavigationMath.remainingFromPosition(from, route.steps, 0)
                nav.update {
                    it.copy(
                        loading = false,
                        rerouting = false,
                        error = false,
                        steps = route.steps,
                        stepIndex = 0,
                        path = Polyline.decode(route.polyline),
                        distanceToManeuverM = route.steps.firstOrNull()?.let { s -> Geo.distanceMeters(from, s.endLocation) },
                        remainingKm = rem?.km,
                        remainingMin = rem?.min,
                    )
                }
                fix.value?.let(::onFix)
            } catch (e: CancellationException) {
                throw e
            } catch (_: Exception) {
                nav.update { it.copy(loading = false, rerouting = false, error = if (reroute) it.error else true) }
            }
        }
    }

    private fun build(ctx: DriverContext?, f: Fix?, n: NavUi, going: Boolean, tick: Int): HomeUiState {
        val trips = ctx?.activeTrips.orEmpty()
        val live = f?.latLng
        val driver = live ?: ctx?.currentLocation?.let { LatLng(it.lat, it.lng) }
        val route = ctx?.optimizedRoute
        val orderByKey = route?.stops?.mapIndexed { i, s -> "${s.kind}-${s.tripId}" to i + 1 }?.toMap().orEmpty()
        val stops = buildList {
            trips.forEachIndexed { i, t ->
                val color = Brand.TripColors[i % Brand.TripColors.size].toArgb()
                t.pickup?.let { add(MapStop("pickup-${t.tripId}", true, it, color, t.customerName, orderByKey["pickup-${t.tripId}"])) }
                t.dropoff?.let { add(MapStop("dropoff-${t.tripId}", false, it, color, t.customerName, orderByKey["dropoff-${t.tripId}"])) }
            }
        }
        val routeLine = when {
            route == null || route.stops.isEmpty() -> emptyList()
            route.path.isNotEmpty() -> route.path
            else -> listOfNotNull(driver) + route.stops.map { it.latLng }
        }.takeIf { it.size >= 2 }.orEmpty()

        val next: NextStop? = route?.stops?.firstOrNull()?.let { first ->
            val trip = trips.firstOrNull { it.tripId == first.tripId }
            val leg = LiveLeg.compute(first.distanceM, first.etaMinutes, ctx.currentLocation?.let { LatLng(it.lat, it.lng) }, live, first.latLng)
            NextStop(
                isPickup = first.isPickup,
                customerName = first.customerName.ifBlank { trip?.customerName.orEmpty() },
                customerPhone = trip?.customerPhone.orEmpty(),
                address = first.address,
                latLng = first.latLng,
                distanceKm = leg.distanceKm,
                etaMinutes = leg.etaMinutes,
                arrived = first.isPickup && trip?.status == TripStatus.ArrivedPickup,
            )
        } ?: ctx?.currentTrip?.let { trip ->
            val toDropoff = trip.status == TripStatus.PickedUp
            val p = (if (toDropoff) trip.dropoff else trip.pickup) ?: return@let null
            val km = trip.distanceKm ?: 0.0
            val eta = trip.etaMinutes ?: 0.0
            val leg = LiveLeg.compute(
                serverDistanceM = if (toDropoff && km > 0) km * 1000 else null,
                serverEtaMin = if (toDropoff && eta > 0) eta else null,
                routeOrigin = if (toDropoff) trip.pickup else null,
                live = live,
                stop = p,
            )
            NextStop(
                isPickup = !toDropoff,
                customerName = trip.customerName,
                customerPhone = trip.customerPhone,
                address = if (toDropoff) trip.dropoffAddress else trip.pickupAddress,
                latLng = p,
                distanceKm = leg.distanceKm,
                etaMinutes = leg.etaMinutes,
                arrived = !toDropoff && trip.status == TripStatus.ArrivedPickup,
            )
        }

        return HomeUiState(
            hasContext = ctx != null,
            online = ctx?.driver?.status == "online",
            activeTripCount = trips.size,
            today = ctx?.todayEarnings,
            driver = driver,
            heading = f?.heading,
            hasLiveFix = live != null,
            stops = stops,
            routeLine = routeLine,
            nextStop = next,
            totalStops = route?.stops?.size ?: 0,
            nav = n,
            goingOnline = going,
            recenterTick = tick,
        )
    }
}
