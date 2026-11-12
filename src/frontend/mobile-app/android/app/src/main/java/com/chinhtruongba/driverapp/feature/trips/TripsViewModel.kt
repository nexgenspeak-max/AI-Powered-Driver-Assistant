package com.chinhtruongba.driverapp.feature.trips

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.chinhtruongba.driverapp.core.data.DriverRepository
import com.chinhtruongba.driverapp.core.data.SessionRepository
import com.chinhtruongba.driverapp.core.model.ApiException
import com.chinhtruongba.driverapp.core.model.OptimizedRoute
import com.chinhtruongba.driverapp.core.model.TodayEarnings
import com.chinhtruongba.driverapp.core.model.Trip
import com.chinhtruongba.driverapp.core.model.TripStatus
import com.chinhtruongba.driverapp.core.util.Haptics
import com.chinhtruongba.driverapp.core.util.Search
import com.chinhtruongba.driverapp.feature.location.LocationSource
import com.chinhtruongba.driverapp.feature.location.LocationTracker
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

enum class TripTab { Pending, Active, Completed }

val PENDING_STATUSES = setOf(TripStatus.Pending, TripStatus.Notified, TripStatus.Calling)

sealed interface TripsDialog {
    data class ConfirmReject(val tripId: String) : TripsDialog
    data class ConfirmCancel(val tripId: String) : TripsDialog

    /** 409 on an arrival action: the server's `detail`, or null for the generic copy. */
    data class ArrivalError(val detail: String?) : TripsDialog
}

data class TripsUiState(
    val driverLoaded: Boolean = false,
    val driverName: String = "",
    val isOnline: Boolean = false,
    val today: TodayEarnings? = null,
    val contextLoaded: Boolean = false,
    val loading: Boolean = false,
    val error: Boolean = false,
    val tab: TripTab = TripTab.Active,
    val query: String = "",
    val pendingCount: Int = 0,
    val activeCount: Int = 0,
    val completedCount: Int = 0,
    val pending: List<Trip> = emptyList(),
    val active: List<Trip> = emptyList(),
    val completed: List<Trip> = emptyList(),
    val optimizedRoute: OptimizedRoute? = null,
    val busyTrips: Set<String> = emptySet(),
    val dialog: TripsDialog? = null,
    val refreshing: Boolean = false,
)

private data class Local(
    val tab: TripTab = TripTab.Active,
    val query: String = "",
    val busy: Set<String> = emptySet(),
    val dialog: TripsDialog? = null,
    val refreshing: Boolean = false,
)

@HiltViewModel
class TripsViewModel @Inject constructor(
    private val session: SessionRepository,
    private val drivers: DriverRepository,
    private val location: LocationSource,
    private val tracker: LocationTracker,
    private val haptics: Haptics,
) : ViewModel() {
    private val local = MutableStateFlow(Local())

    val ui: StateFlow<TripsUiState> = combine(session.me, drivers.context, local) { me, ctxL, l ->
        val ctx = ctxL.data
        val match = { t: Trip -> Search.matches(l.query, listOf(t.customerName, t.customerPhone)) }
        val pending = ctx?.upcomingTrips.orEmpty().filter { it.status in PENDING_STATUSES }
        val active = ctx?.activeTrips.orEmpty()
        val completed = ctx?.completedTrips.orEmpty()
        TripsUiState(
            driverLoaded = me.data != null,
            driverName = me.data?.name.orEmpty(),
            isOnline = me.data?.isOnline == true,
            today = ctx?.todayEarnings,
            contextLoaded = ctx != null,
            loading = ctxL.loading,
            error = ctxL.error != null && ctx == null,
            tab = l.tab,
            query = l.query,
            pendingCount = pending.size,
            activeCount = active.size,
            completedCount = completed.size,
            pending = pending.filter(match),
            active = active.filter(match),
            completed = completed.filter(match),
            optimizedRoute = ctx?.optimizedRoute,
            busyTrips = l.busy,
            dialog = l.dialog,
            refreshing = l.refreshing,
        )
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), TripsUiState())

    init {
        drivers.ensureFresh()
    }

    fun selectTab(t: TripTab) = local.update { it.copy(tab = t) }
    fun search(q: String) = local.update { it.copy(query = q) }
    fun dismissDialog() = local.update { it.copy(dialog = null) }
    fun retry() = drivers.invalidate()

    fun pullRefresh() {
        viewModelScope.launch {
            local.update { it.copy(refreshing = true) }
            try {
                drivers.refresh()
            } finally {
                local.update { it.copy(refreshing = false) }
            }
        }
    }

    /** Optimistic toggle; the UI asks for location permission before going online. */
    fun setOnline(online: Boolean) {
        viewModelScope.launch {
            try {
                drivers.setOnline(online)
                haptics.success()
            } catch (e: CancellationException) {
                throw e
            } catch (_: Exception) {
                haptics.error()
            }
        }
    }

    private fun busy(id: String, on: Boolean) = local.update { it.copy(busy = if (on) it.busy + id else it.busy - id) }

    private fun run(id: String, block: suspend () -> Unit) {
        if (id in local.value.busy) return
        viewModelScope.launch {
            busy(id, true)
            try {
                block()
            } catch (e: CancellationException) {
                throw e
            } catch (_: Exception) {
                // card stays as-is; context refetch reconciles
            } finally {
                busy(id, false)
            }
        }
    }

    /** Accept pushes a live fix and PATCHes in parallel. */
    fun accept(id: String) = run(id) {
        tracker.pushImmediate()
        drivers.acceptTrip(id)
    }

    fun askReject(id: String) = local.update { it.copy(dialog = TripsDialog.ConfirmReject(id)) }
    fun confirmReject(id: String) {
        dismissDialog()
        run(id) { drivers.rejectTrip(id) }
    }

    fun askCancel(id: String) = local.update { it.copy(dialog = TripsDialog.ConfirmCancel(id)) }
    fun confirmCancel(id: String) {
        dismissDialog()
        run(id) { drivers.cancelTrip(id) }
    }

    /** Arrival actions read a fresh GPS fix first; a 409 shows the server's detail. */
    fun advance(trip: Trip) {
        val next = when (trip.status) {
            TripStatus.Confirmed -> "arrived_pickup"
            TripStatus.ArrivedPickup -> "picked_up"
            TripStatus.PickedUp -> "completed"
            else -> return
        }
        if (trip.tripId in local.value.busy) return
        viewModelScope.launch {
            busy(trip.tripId, true)
            try {
                val fix = location.currentFix()
                drivers.advanceTrip(trip.tripId, next, fix?.latLng)
                if (next == "completed") haptics.success()
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                val detail = (e as? ApiException)?.detail
                local.update { it.copy(dialog = TripsDialog.ArrivalError(detail)) }
            } finally {
                busy(trip.tripId, false)
            }
        }
    }
}
