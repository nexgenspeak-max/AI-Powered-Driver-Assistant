package com.chinhtruongba.driverapp.feature

import androidx.lifecycle.viewModelScope
import com.chinhtruongba.driverapp.core.FakeTokenStore
import com.chinhtruongba.driverapp.core.data.DriverRepository
import com.chinhtruongba.driverapp.core.data.SessionRepository
import com.chinhtruongba.driverapp.core.model.AuthTokens
import com.chinhtruongba.driverapp.core.model.DriverContext
import com.chinhtruongba.driverapp.core.model.LatLng
import com.chinhtruongba.driverapp.core.model.NavigationRoute
import com.chinhtruongba.driverapp.core.model.OptimizedRoute
import com.chinhtruongba.driverapp.core.model.OptimizedRouteStop
import com.chinhtruongba.driverapp.core.model.RouteStep
import com.chinhtruongba.driverapp.feature.home.HomeViewModel
import com.chinhtruongba.driverapp.feature.location.LocationTracker
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.cancel
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.runCurrent
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Test

class HomeViewModelTest {
    private val stopA = LatLng(21.01, 105.81)
    private val stopB = LatLng(21.05, 105.85)
    private val trip = FakeTripApi()
    private val source = FixedLocationSource()

    private fun contextWithNextStop(at: LatLng) = DriverContext(
        optimizedRoute = OptimizedRoute(stops = listOf(OptimizedRouteStop(tripId = "t1", kind = "pickup", lat = at.lat, lng = at.lng))),
    )

    private fun routeTo(name: String, at: LatLng) =
        NavigationRoute(steps = listOf(RouteStep(instruction = name, startLocation = LatLng(21.0, 105.8), endLocation = at)))

    private suspend fun TestScope.viewModel(): Pair<HomeViewModel, DriverRepository> {
        val session = SessionRepository(FakeTokenStore(AuthTokens("a", "r")), FakeAuthApi(), trip, backgroundScope)
        val drivers = DriverRepository(trip, session, backgroundScope)
        session.refreshMe()
        val vm = HomeViewModel(drivers, source, LocationTracker(source, drivers, session, backgroundScope))
        runCurrent()
        return vm to drivers
    }

    @Test
    fun `Home does not run its own GPS watch`() = runMainTest {
        val (vm, _) = viewModel()
        assertEquals("fixes come from LocationTracker through location.last", 0, source.watchers)
        vm.viewModelScope.cancel()
    }

    @Test
    fun `navigation shows the route to the new stop when the target changes mid-request`() = runMainTest {
        trip.context = contextWithNextStop(stopA)
        val slowA = CompletableDeferred<Unit>()
        val requested = mutableListOf<LatLng>()
        trip.route = { lat, lng ->
            val to = LatLng(lat, lng)
            requested += to
            if (to == stopA) {
                slowA.await()
                routeTo("to A", stopA)
            } else {
                routeTo("to B", stopB)
            }
        }
        val (vm, drivers) = viewModel()

        vm.startNavigation()
        runCurrent()
        assertEquals(listOf(stopA), requested)

        // The driver finishes stop A: the context now points at stop B while A's route is in flight.
        trip.context = contextWithNextStop(stopB)
        drivers.refresh()
        runCurrent()
        slowA.complete(Unit)
        runCurrent()

        assertEquals(listOf(stopA, stopB), requested)
        val nav = vm.state.value.nav
        assertEquals(listOf("to B"), nav.steps.map { it.instruction })
        assertFalse(nav.loading)
        vm.viewModelScope.cancel()
    }
}
