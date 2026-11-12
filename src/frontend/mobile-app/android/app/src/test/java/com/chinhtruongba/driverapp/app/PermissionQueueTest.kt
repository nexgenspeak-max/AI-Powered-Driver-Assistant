package com.chinhtruongba.driverapp.app

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

private const val FINE = "android.permission.ACCESS_FINE_LOCATION"
private const val COARSE = "android.permission.ACCESS_COARSE_LOCATION"
private const val BACKGROUND = "android.permission.ACCESS_BACKGROUND_LOCATION"
private const val CONTACTS = "android.permission.READ_CONTACTS"

class PermissionQueueTest {
    private class Rig {
        val granted = mutableSetOf<String>()
        val launched = mutableListOf<List<String>>()
        val queue = PermissionQueue(launch = { launched += it.toList() }, isGranted = { it in granted })
    }

    @Test
    fun `a contacts request during the location prompt does not steal its callback`() {
        val r = Rig()
        var location: Map<String, Boolean>? = null
        var contacts: Map<String, Boolean>? = null
        r.queue.request(arrayOf(FINE, COARSE)) { location = it }
        r.queue.request(arrayOf(CONTACTS)) { contacts = it }
        assertEquals("one system dialog at a time", listOf(listOf(FINE, COARSE)), r.launched)

        r.queue.onResult(mapOf(FINE to true, COARSE to true))
        assertEquals(mapOf(FINE to true, COARSE to true), location)
        assertEquals(null, contacts)
        assertEquals("contacts asked next", listOf(CONTACTS), r.launched.last())

        r.queue.onResult(mapOf(CONTACTS to false))
        assertEquals(mapOf(CONTACTS to false), contacts)
    }

    @Test
    fun `already granted permissions answer at once without a dialog`() {
        val r = Rig().apply { granted += CONTACTS }
        var res: Map<String, Boolean>? = null
        r.queue.request(arrayOf(CONTACTS)) { res = it }
        assertEquals(mapOf(CONTACTS to true), res)
        assertTrue(r.launched.isEmpty())
    }

    @Test
    fun `a request made from a result callback is queued after the current one finishes`() {
        val r = Rig()
        var bg: Map<String, Boolean>? = null
        r.queue.request(arrayOf(FINE, COARSE)) { r.queue.request(arrayOf(BACKGROUND)) { bg = it } }
        r.queue.onResult(mapOf(FINE to true, COARSE to true))
        assertEquals(listOf(BACKGROUND), r.launched.last())
        r.queue.onResult(mapOf(BACKGROUND to true))
        assertEquals(mapOf(BACKGROUND to true), bg)
    }

    @Test
    fun `approximate-only location counts as foreground granted`() {
        val coarseOnly = LocationGrant.from(mapOf(FINE to false, COARSE to true))
        assertTrue(coarseOnly.foreground)
        assertTrue(coarseOnly.approximate)

        val precise = LocationGrant.from(mapOf(FINE to true, COARSE to true))
        assertTrue(precise.foreground)
        assertFalse(precise.approximate)

        val denied = LocationGrant.from(mapOf(FINE to false, COARSE to false))
        assertFalse(denied.foreground)
    }

    @Test
    fun `going online with approximate location still asks for background`() {
        val r = Rig()
        var done: LocationGrant? = null
        r.queue.requestLocationForOnline { done = it }
        r.queue.onResult(mapOf(FINE to false, COARSE to true)) // Android 12+ "Approximate"
        assertEquals("background is asked, not skipped", listOf(BACKGROUND), r.launched.last())
        r.queue.onResult(mapOf(BACKGROUND to true))
        assertEquals(LocationGrant(foreground = true, approximate = true, background = true), done)
    }

    @Test
    fun `denied foreground location finishes without asking for background`() {
        val r = Rig()
        var done: LocationGrant? = null
        r.queue.requestLocationForOnline { done = it }
        r.queue.onResult(mapOf(FINE to false, COARSE to false))
        assertEquals(1, r.launched.size)
        assertEquals(LocationGrant(foreground = false, approximate = false, background = false), done)
    }
}
