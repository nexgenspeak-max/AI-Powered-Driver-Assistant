package com.chinhtruongba.driverapp.service

import org.junit.After
import org.junit.Assert.assertEquals
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

    @Before fun reset() { CzenForegroundService.Reasons.current = emptySet() }
    @After fun clear() { CzenForegroundService.Reasons.current = emptySet() }

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
}
