package com.chinhtruongba.driverapp.app

import android.Manifest
import com.chinhtruongba.driverapp.feature.FakeAsker
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class PermissionGatewayTest {
    private val mic = Manifest.permission.RECORD_AUDIO
    private val notifications = Manifest.permission.POST_NOTIFICATIONS
    private val granted = mutableSetOf<String>()

    private fun gateway(sdk: Int = 34) = PermissionGateway(isGranted = { it in granted }, sdk = sdk)

    @Test
    fun `a request without a visible activity waits and is asked when one starts`() {
        val gateway = gateway()
        val results = mutableListOf<Map<String, Boolean>>()
        gateway.requestEach(arrayOf(mic)) { results += it }
        assertTrue("nobody to ask yet", results.isEmpty())

        val asker = FakeAsker { true }
        gateway.attach(asker)
        assertEquals(listOf(listOf(mic)), asker.asked)
        assertEquals(listOf(mapOf(mic to true)), results)
    }

    @Test
    fun `an already granted permission answers at once without asking`() {
        granted += mic
        val gateway = gateway()
        val asker = FakeAsker { false }
        gateway.attach(asker)
        var result: Map<String, Boolean>? = null
        gateway.requestEach(arrayOf(mic)) { result = it }
        assertEquals(mapOf(mic to true), result)
        assertTrue(asker.asked.isEmpty())
    }

    @Test
    fun `after the activity stops requests wait again`() {
        val gateway = gateway()
        val asker = FakeAsker { true }
        gateway.attach(asker)
        gateway.detach(asker)
        var answered = false
        gateway.requestEach(arrayOf(mic)) { answered = true }
        assertEquals(false, answered)
        gateway.attach(asker)
        assertTrue(answered)
    }

    @Test
    fun `notifications are asked once on Android 13 and never below`() {
        val asker = FakeAsker { false }
        val t = gateway(sdk = 33).also { it.attach(asker) }
        t.requestNotifications()
        t.requestNotifications()
        assertEquals(listOf(listOf(notifications)), asker.asked)

        val older = FakeAsker { false }
        gateway(sdk = 32).also { it.attach(older) }.requestNotifications()
        assertTrue(older.asked.isEmpty())
    }
}
