package com.chinhtruongba.driverapp.feature

import com.chinhtruongba.driverapp.app.PermissionGateway
import com.chinhtruongba.driverapp.core.FakeTokenStore
import com.chinhtruongba.driverapp.core.data.DriverRepository
import com.chinhtruongba.driverapp.core.data.SessionRepository
import com.chinhtruongba.driverapp.core.model.AuthTokens
import com.chinhtruongba.driverapp.core.model.AuthUser
import com.chinhtruongba.driverapp.feature.location.BackgroundLocationCoordinator
import com.chinhtruongba.driverapp.service.CzenForegroundService
import com.chinhtruongba.driverapp.service.ServiceForegroundController
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Before
import org.junit.Test

class BackgroundLocationTest {
    private val location = CzenForegroundService.Reasons.LOCATION

    @Before fun reset() {
        CzenForegroundService.Reasons.current = emptySet()
        CzenForegroundService.Reasons.running = emptySet()
    }

    @After fun clear() = reset()

    @Test
    fun `tracking refused by the OS starts again the next time the app is in the foreground`() = runTest {
        val trip = FakeTripApi()
        val auth = FakeAuthApi(AuthUser(id = "a1", name = "Khoa", phone = "0901234567", status = "online"))
        val session = SessionRepository(FakeTokenStore(AuthTokens("a", "r")), auth, trip, backgroundScope)
        session.refreshMe()
        val source = FixedLocationSource().apply { background = true }
        val inForeground = MutableStateFlow(true)
        BackgroundLocationCoordinator(
            session = session,
            drivers = DriverRepository(trip, session, backgroundScope),
            source = source,
            foreground = ServiceForegroundController(start = { }, stop = { }),
            permissions = PermissionGateway(isGranted = { true }, sdk = 30),
            scope = backgroundScope,
            foregrounded = { inForeground },
            osPermitted = { true },
        ).start()
        runCurrent()
        assertEquals(1, source.active)

        // The service refuses the location type and drops the reason.
        CzenForegroundService.Reasons.settle(wanted = setOf(location), nowRunning = emptySet())
        runCurrent()
        assertEquals("pushes stop with the service", 0, source.active)

        inForeground.value = false
        runCurrent()
        inForeground.value = true
        runCurrent()
        assertEquals("retried without an offline/online toggle", 1, source.active)
        assertEquals(setOf(location), CzenForegroundService.Reasons.current)
    }
}
