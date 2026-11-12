package com.chinhtruongba.driverapp.core

import com.chinhtruongba.driverapp.core.model.LatLng
import com.chinhtruongba.driverapp.core.util.PushCadence
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class PushCadenceTest {
    private val here = LatLng(21.0285, 105.8522)
    private val near = LatLng(21.0247, 105.8530) // ~430 m
    private val far = LatLng(21.0700, 105.8522) // ~4.6 km
    private fun moved(m: Double) = LatLng(here.lat + m / 111_320.0, here.lng)

    @Test fun `policy follows the distance to the nearest stop`() {
        assertEquals(PushCadence.Policy(10 * 60_000L, null), PushCadence.policy(here, emptyList()))
        assertEquals(PushCadence.Policy(15_000L, 150.0), PushCadence.policy(here, listOf(far, near)))
        assertEquals(PushCadence.Policy(60_000L, 500.0), PushCadence.policy(here, listOf(far)))
    }

    @Test fun `first fix always pushes`() {
        assertTrue(PushCadence.shouldPush(1_000, 0, here, null, emptyList()))
    }

    @Test fun `idle drivers push every 10 minutes regardless of movement`() {
        assertFalse(PushCadence.shouldPush(9 * 60_000L, 1, moved(2000.0), here, emptyList()))
        assertTrue(PushCadence.shouldPush(10 * 60_000L + 1, 1, here, here, emptyList()))
    }

    @Test fun `near a stop pushes on 15 s or 150 m`() {
        val stops = listOf(near)
        assertFalse(PushCadence.shouldPush(10_000, 1, moved(100.0), here, stops))
        assertTrue(PushCadence.shouldPush(10_000, 1, moved(160.0), here, stops))
        assertTrue(PushCadence.shouldPush(15_001, 1, here, here, stops))
    }

    @Test fun `en route pushes on 60 s or 500 m`() {
        val stops = listOf(far)
        assertFalse(PushCadence.shouldPush(30_000, 1, moved(300.0), here, stops))
        assertTrue(PushCadence.shouldPush(30_000, 1, moved(520.0), here, stops))
        assertTrue(PushCadence.shouldPush(60_001, 1, here, here, stops))
    }

    @Test fun `background throttle is 20 s or 150 m`() {
        assertTrue(PushCadence.shouldPushBackground(5_000, 0, here, null))
        assertFalse(PushCadence.shouldPushBackground(10_000, 1, moved(100.0), here))
        assertTrue(PushCadence.shouldPushBackground(10_000, 1, moved(200.0), here))
        assertTrue(PushCadence.shouldPushBackground(20_001, 1, here, here))
    }
}
