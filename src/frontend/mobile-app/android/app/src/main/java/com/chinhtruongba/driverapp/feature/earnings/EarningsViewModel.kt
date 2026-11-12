package com.chinhtruongba.driverapp.feature.earnings

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.chinhtruongba.driverapp.core.data.DriverRepository
import com.chinhtruongba.driverapp.core.data.Loadable
import com.chinhtruongba.driverapp.core.data.SessionRepository
import com.chinhtruongba.driverapp.core.model.EarningsSummary
import com.chinhtruongba.driverapp.core.model.Trip
import com.chinhtruongba.driverapp.core.util.Format
import com.chinhtruongba.driverapp.core.util.Search
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.time.LocalDate
import java.time.ZoneId
import java.time.ZonedDateTime
import java.time.temporal.ChronoUnit
import javax.inject.Inject

enum class EarningsPeriod { Today, Week, Month }

data class DayBucket(val date: LocalDate, val dayOfWeek: Int, val total: Double, val isToday: Boolean)

/** Day heading: Today / Yesterday / an older date. */
sealed interface DayHeading {
    data object Today : DayHeading
    data object Yesterday : DayHeading
    data class Date(val date: LocalDate) : DayHeading
    data object Other : DayHeading
}

data class DayGroup(val heading: DayHeading, val total: Double, val trips: List<Trip>)

/** Pure helpers from CompletedTripEarningsList / WeeklyEarningsChart. */
object EarningsMath {
    private fun completedAt(t: Trip): ZonedDateTime? = Format.parseInstant(t.updatedAt.ifBlank { t.createdAt })

    fun filterForPeriod(trips: List<Trip>, period: EarningsPeriod, now: ZonedDateTime = ZonedDateTime.now()): List<Trip> {
        val from = when (period) {
            EarningsPeriod.Today -> now.truncatedTo(ChronoUnit.DAYS)
            EarningsPeriod.Week -> now.minusDays(7)
            EarningsPeriod.Month -> now.minusDays(30)
        }
        return trips.filter { t -> completedAt(t)?.let { !it.isBefore(from) } == true }
    }

    fun filterByQuery(trips: List<Trip>, q: String): List<Trip> =
        if (q.isBlank()) trips else trips.filter { Search.matches(q, listOf(it.customerName, it.pickupAddress, it.dropoffAddress)) }

    /** Last 7 calendar days (oldest → today), summing fares by completion day. */
    fun lastSevenDays(trips: List<Trip>, today: LocalDate = LocalDate.now()): List<DayBucket> {
        val days = (6 downTo 0).map { today.minusDays(it.toLong()) }
        val sums = HashMap<LocalDate, Double>()
        trips.forEach { t ->
            val d = completedAt(t)?.withZoneSameInstant(ZoneId.systemDefault())?.toLocalDate() ?: return@forEach
            sums[d] = (sums[d] ?: 0.0) + (t.estimatedFare ?: 0.0)
        }
        return days.map { DayBucket(it, it.dayOfWeek.value % 7, sums[it] ?: 0.0, it == today) }
    }

    fun heading(t: Trip, today: LocalDate = LocalDate.now()): DayHeading {
        val d = completedAt(t)?.withZoneSameInstant(ZoneId.systemDefault())?.toLocalDate() ?: return DayHeading.Other
        return when (ChronoUnit.DAYS.between(d, today)) {
            0L -> DayHeading.Today
            1L -> DayHeading.Yesterday
            else -> DayHeading.Date(d)
        }
    }

    /** Groups newest-first trips by completion day, preserving order. */
    fun groupByDay(trips: List<Trip>, today: LocalDate = LocalDate.now()): List<DayGroup> {
        val out = ArrayList<DayGroup>()
        for (t in trips) {
            val h = heading(t, today)
            val last = out.lastOrNull()
            if (last != null && last.heading == h) {
                out[out.lastIndex] = last.copy(total = last.total + (t.estimatedFare ?: 0.0), trips = last.trips + t)
            } else {
                out += DayGroup(h, t.estimatedFare ?: 0.0, listOf(t))
            }
        }
        return out
    }
}

data class EarningsUiState(
    val contextLoaded: Boolean = false,
    val contextLoading: Boolean = true,
    val contextError: Boolean = false,
    val period: EarningsPeriod = EarningsPeriod.Today,
    val query: String = "",
    val total: Double? = null,
    val tripCount: Int? = null,
    val hoursOnline: Double? = null,
    val bonus: Double? = null,
    val currency: String = "VND",
    val totalsLoading: Boolean = false,
    val totalsError: Boolean = false,
    val week: List<DayBucket> = emptyList(),
    val hasCompleted: Boolean = false,
    val periodCount: Int = 0,
    val groups: List<DayGroup> = emptyList(),
    val visibleCount: Int = 0,
    val truncated: Boolean = false,
    val isOnline: Boolean = false,
    val driverReady: Boolean = false,
)

private data class EarningsLocal(val period: EarningsPeriod = EarningsPeriod.Today, val query: String = "")

@HiltViewModel
class EarningsViewModel @Inject constructor(
    private val drivers: DriverRepository,
    private val session: SessionRepository,
) : ViewModel() {
    private val local = MutableStateFlow(EarningsLocal())

    private val summary = local.flatMapLatest { l ->
        when (l.period) {
            EarningsPeriod.Today -> flowOf(Loadable<EarningsSummary>())
            EarningsPeriod.Week -> drivers.summary("week")
            EarningsPeriod.Month -> drivers.summary("month")
        }
    }

    val ui: StateFlow<EarningsUiState> = combine(drivers.context, summary, local, session.me) { ctxL, sum, l, me ->
        val ctx = ctxL.data
        val completed = ctx?.completedTrips.orEmpty()
        val periodTrips = EarningsMath.filterForPeriod(completed, l.period)
        val visible = EarningsMath.filterByQuery(periodTrips, l.query)
        val today = l.period == EarningsPeriod.Today
        val reported = if (today) ctx?.todayEarnings?.tripCount else sum.data?.tripCount
        EarningsUiState(
            contextLoaded = ctx != null,
            contextLoading = ctxL.loading && ctx == null,
            contextError = ctxL.error != null && ctx == null,
            period = l.period,
            query = l.query,
            total = if (today) ctx?.todayEarnings?.totalEarnings else sum.data?.totalEarnings,
            tripCount = reported,
            hoursOnline = if (today) ctx?.todayEarnings?.hoursOnline else null,
            bonus = null, // RN shows Giờ online today and no third stat for week/month
            currency = (if (today) ctx?.todayEarnings?.currency else sum.data?.currency) ?: "VND",
            totalsLoading = !today && sum.isInitialLoading,
            totalsError = !today && sum.error != null && sum.data == null,
            week = EarningsMath.lastSevenDays(EarningsMath.filterForPeriod(completed, EarningsPeriod.Week)),
            hasCompleted = completed.isNotEmpty(),
            periodCount = periodTrips.size,
            groups = EarningsMath.groupByDay(visible),
            visibleCount = visible.size,
            truncated = l.query.isBlank() && reported != null && reported > periodTrips.size && periodTrips.isNotEmpty(),
            isOnline = me.data?.isOnline == true,
            driverReady = me.data != null,
        )
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), EarningsUiState())

    init {
        drivers.ensureFresh()
    }

    fun setPeriod(p: EarningsPeriod) {
        local.update { it.copy(period = p, query = "") }
        if (p != EarningsPeriod.Today) loadSummary(p)
    }

    fun search(q: String) = local.update { it.copy(query = q) }
    fun retryContext() = drivers.invalidate()
    fun retryTotals() = loadSummary(local.value.period)

    private fun loadSummary(p: EarningsPeriod) {
        val key = if (p == EarningsPeriod.Month) "month" else "week"
        viewModelScope.launch { drivers.loadSummary(key) }
    }

    fun goOnline() {
        viewModelScope.launch {
            try {
                drivers.setOnline(true)
            } catch (e: CancellationException) {
                throw e
            } catch (_: Exception) {
                // rolled back by the repository
            }
        }
    }
}
