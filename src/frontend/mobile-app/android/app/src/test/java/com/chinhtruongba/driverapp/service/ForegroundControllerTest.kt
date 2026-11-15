package com.chinhtruongba.driverapp.service

import android.content.pm.ServiceInfo
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.runTest
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

class ForegroundControllerTest {
    private var starts = 0
    private var stops = 0
    private var failStart = false

    private val controller = ServiceForegroundController(
        start = {
            starts++
            if (failStart) throw IllegalStateException("ForegroundServiceStartNotAllowedException")
        },
        stop = { stops++ },
    )

    @Before fun reset() {
        CzenForegroundService.Reasons.current = emptySet()
        CzenForegroundService.Reasons.running = emptySet()
    }

    @After fun clear() = reset()

    @Test
    fun `a failed start rolls the reason back so state never claims a running service`() {
        failStart = true
        controller.startCall()
        assertEquals(emptySet<String>(), CzenForegroundService.Reasons.current)
        assertEquals(1, starts)
    }

    @Test
    fun `a failed start keeps the reasons that were already running`() {
        controller.startLocation()
        failStart = true
        controller.startWakeWord()
        assertEquals(setOf(CzenForegroundService.Reasons.LOCATION), CzenForegroundService.Reasons.current)
    }

    @Test
    fun `successful start and stop keep reasons in sync`() {
        controller.startCall()
        controller.startLocation()
        assertEquals(setOf("call", "location"), CzenForegroundService.Reasons.current)
        controller.stopCall()
        controller.stopLocation()
        assertEquals(emptySet<String>(), CzenForegroundService.Reasons.current)
        assertEquals(1, stops)
    }

    @Test
    fun `a refused start is reported to the caller`() {
        assertTrue(controller.startLocation())
        failStart = true
        assertFalse(controller.startWakeWord())
        assertFalse(controller.startCall())
    }

    @Test
    fun `a reason that is already held does not restart the service`() {
        assertTrue(controller.startWakeWord())
        failStart = true // e.g. the app is in the background now
        assertTrue("hands-free already holds the service", controller.startWakeWord())
        assertEquals(1, starts)
        assertEquals(setOf(CzenForegroundService.Reasons.WAKE), CzenForegroundService.Reasons.current)
    }

    @Test
    fun `Android 10 starts a call with the manifest default type instead of none`() {
        val call = setOf(CzenForegroundService.Reasons.CALL)
        val wake = setOf(CzenForegroundService.Reasons.WAKE)
        val location = setOf(CzenForegroundService.Reasons.LOCATION)
        assertEquals(ServiceInfo.FOREGROUND_SERVICE_TYPE_MANIFEST, foregroundTypeFor(call, sdk = 29))
        assertEquals(ServiceInfo.FOREGROUND_SERVICE_TYPE_MANIFEST, foregroundTypeFor(wake + location, sdk = 29))
        assertEquals(ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION, foregroundTypeFor(location, sdk = 29))
        assertEquals(ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE, foregroundTypeFor(call, sdk = 30))
        assertEquals(
            ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE or ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION,
            foregroundTypeFor(wake + location, sdk = 34),
        )
    }

    @Test
    fun `a refused typed start falls back to the reasons that were already running`() {
        val location = CzenForegroundService.Reasons.LOCATION
        val wake = CzenForegroundService.Reasons.WAKE
        val attempts = mutableListOf<Set<String>>()
        val running = ForegroundStart.negotiate(wanted = setOf(location, wake), running = setOf(location)) { reasons ->
            attempts += reasons
            wake !in reasons // the microphone type is refused
        }
        assertEquals(setOf(location), running)
        assertEquals(listOf(setOf(location, wake), setOf(location)), attempts)

        assertEquals("nothing was running: stop", emptySet<String>(), ForegroundStart.negotiate(setOf(wake), emptySet()) { false })
        assertEquals(setOf(wake), ForegroundStart.negotiate(setOf(wake), emptySet()) { true })
    }

    /** What onStartCommand does, with every typed start refused (app in the background). */
    private fun refusedStart() {
        val wanted = CzenForegroundService.Reasons.current
        val running = ForegroundStart.negotiate(wanted, CzenForegroundService.Reasons.running) { false }
        CzenForegroundService.Reasons.settle(wanted, running)
    }

    @Test
    fun `a call refused in the background keeps the service running for hands-free`() {
        val wake = CzenForegroundService.Reasons.WAKE
        controller.startWakeWord()
        CzenForegroundService.Reasons.running = setOf(wake)

        // Wake word fires in the background: {wake, call} has the same microphone type as {wake}.
        controller.startCall()
        refusedStart()

        assertEquals("the service stays up for the wake word", setOf(wake), CzenForegroundService.Reasons.running)
        assertEquals("only the call is dropped", setOf(wake), CzenForegroundService.Reasons.current)
        assertEquals(0, stops)
    }

    @Test
    fun `a refused refresh after a call ends keeps hands-free and location running`() {
        val wake = CzenForegroundService.Reasons.WAKE
        val location = CzenForegroundService.Reasons.LOCATION
        val call = CzenForegroundService.Reasons.CALL
        controller.startWakeWord()
        controller.startLocation()
        controller.startCall()
        CzenForegroundService.Reasons.running = setOf(wake, location, call)

        // The call ends in the background: wanted = {wake, location}, a subset of what runs.
        controller.stopCall()
        refusedStart()

        assertEquals(setOf(wake, location), CzenForegroundService.Reasons.running)
        assertEquals(setOf(wake, location), CzenForegroundService.Reasons.current)
        assertEquals(0, stops)
    }

    @Test
    fun `the stop-at-once fallback uses a type the platform accepts`() {
        assertEquals(0, fallbackForegroundType(sdk = 33))
        assertEquals(ServiceInfo.FOREGROUND_SERVICE_TYPE_SHORT_SERVICE, fallbackForegroundType(sdk = 34))
        assertEquals(ServiceInfo.FOREGROUND_SERVICE_TYPE_SHORT_SERVICE, fallbackForegroundType(sdk = 36))
    }

    @Test
    fun `only the refused reason is dropped and its owner is told`() = runTest {
        val location = CzenForegroundService.Reasons.LOCATION
        val wake = CzenForegroundService.Reasons.WAKE
        val told = mutableListOf<String>()
        backgroundScope.launch(UnconfinedTestDispatcher(testScheduler)) { controller.refused.collect { told += it } }
        controller.startLocation()
        CzenForegroundService.Reasons.running = setOf(location)
        controller.startWakeWord()

        // What the service does when the typed start for {location, wake} is refused.
        CzenForegroundService.Reasons.settle(wanted = setOf(location, wake), nowRunning = setOf(location))

        assertEquals(setOf(location), CzenForegroundService.Reasons.current)
        assertEquals(setOf(location), CzenForegroundService.Reasons.running)
        assertEquals(listOf(wake), told)
    }
}
