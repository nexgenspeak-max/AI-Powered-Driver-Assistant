package com.chinhtruongba.driverapp.feature

import android.Manifest
import com.chinhtruongba.driverapp.app.PermissionAsker
import com.chinhtruongba.driverapp.app.PermissionGateway
import com.chinhtruongba.driverapp.core.FakeTokenStore
import com.chinhtruongba.driverapp.core.data.DriverRepository
import com.chinhtruongba.driverapp.core.data.SessionRepository
import com.chinhtruongba.driverapp.core.model.AuthTokens
import com.chinhtruongba.driverapp.feature.voice.ChatStore
import com.chinhtruongba.driverapp.feature.voice.ContactsPermissionGate
import com.chinhtruongba.driverapp.feature.voice.VoiceConnector
import com.chinhtruongba.driverapp.feature.voice.VoiceSession
import com.chinhtruongba.driverapp.feature.voice.VoiceStatus
import kotlinx.coroutines.async
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.advanceTimeBy
import kotlinx.coroutines.test.currentTime
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class VoiceConnectorTest {
    private val phone = "0901234567"
    private val engine = FakeEngine()
    private val mic = Manifest.permission.RECORD_AUDIO

    private class Rig(val voice: VoiceSession, val session: SessionRepository)

    private suspend fun TestScope.rig(): Rig {
        val trip = FakeTripApi()
        val session = SessionRepository(FakeTokenStore(AuthTokens("a", "r")), FakeAuthApi(), trip, backgroundScope)
        session.refreshMe()
        val drivers = DriverRepository(trip, session, backgroundScope)
        val voice = VoiceSession(engine, drivers, FakePrefs(), NoFiller(), RecordingForeground(), FakeContacts(), ChatStore(), backgroundScope)
        return Rig(voice, session)
    }

    private fun TestScope.settle() {
        advanceTimeBy(2_000)
        runCurrent()
    }

    @Test
    fun `every connect asks for the microphone and a denial ends in Error`() = runTest {
        val r = rig()
        val asker = FakeAsker { false }
        val gateway = PermissionGateway(isGranted = { false }, sdk = 30).also { it.attach(asker) }

        VoiceConnector(r.voice, gateway, r.session).connect(phone)
        settle()

        assertEquals(listOf(listOf(mic)), asker.asked)
        assertEquals(VoiceStatus.Error, r.voice.state.value.status)
        assertEquals("no room without a microphone", 0, engine.connects)
    }

    @Test
    fun `connects made without a visible activity collapse into one prompt and one session`() = runTest {
        val r = rig()
        val gateway = PermissionGateway(isGranted = { false }, sdk = 30)
        val connector = VoiceConnector(r.voice, gateway, r.session)
        connector.connect(phone)
        connector.connect(phone)
        connector.connect(phone)
        settle()
        assertEquals(VoiceStatus.Idle, r.voice.state.value.status)

        val asker = FakeAsker { true }
        gateway.attach(asker)
        settle()
        assertEquals("one prompt", 1, asker.asked.size)
        assertEquals("one session", 1, engine.connects)
        assertEquals(VoiceStatus.Connected, r.voice.state.value.status)
    }

    @Test
    fun `a waiting connect that went stale is dropped without a prompt`() = runTest {
        val r = rig()
        val gateway = PermissionGateway(isGranted = { false }, sdk = 30)
        val connector = VoiceConnector(r.voice, gateway, r.session)
        var wanted = true
        var dropped = 0
        connector.connect(phone, stillWanted = { wanted }, onDropped = { dropped++ })

        wanted = false // e.g. the nudge is gone by the time the driver opens the app
        val asker = FakeAsker { true }
        gateway.attach(asker)
        settle()

        assertTrue(asker.asked.isEmpty())
        assertEquals(1, dropped)
        assertEquals(VoiceStatus.Idle, r.voice.state.value.status)
        assertEquals(0, engine.connects)
    }

    @Test
    fun `a waiting connect is dropped after sign-out`() = runTest {
        val r = rig()
        val gateway = PermissionGateway(isGranted = { false }, sdk = 30)
        var dropped = 0
        VoiceConnector(r.voice, gateway, r.session).connect(phone, onDropped = { dropped++ })

        r.session.logoutAndReset()
        val asker = FakeAsker { true }
        gateway.attach(asker)
        settle()

        assertTrue(asker.asked.isEmpty())
        assertEquals(1, dropped)
        assertEquals(0, engine.connects)
    }

    @Test
    fun `an answer that arrives after the session started elsewhere does not connect again`() = runTest {
        val r = rig()
        var answer: ((Map<String, Boolean>) -> Unit)? = null
        val slowAsker = object : PermissionAsker {
            override fun requestEach(permissions: Array<String>, onResult: (Map<String, Boolean>) -> Unit) { answer = onResult }
        }
        val gateway = PermissionGateway(isGranted = { false }, sdk = 30).also { it.attach(slowAsker) }
        VoiceConnector(r.voice, gateway, r.session).connect(phone)

        r.voice.connect(phone) // connected another way while the dialog was showing
        settle()
        answer!!(mapOf(mic to true))
        settle()
        assertEquals(1, engine.connects)
    }

    @Test
    fun `a denied notification permission does not block the connect`() = runTest {
        val r = rig()
        val asker = FakeAsker { it == mic }
        val gateway = PermissionGateway(isGranted = { false }, sdk = 34).also { it.attach(asker) }

        VoiceConnector(r.voice, gateway, r.session).connect(phone)
        settle()

        assertTrue(listOf(Manifest.permission.POST_NOTIFICATIONS) in asker.asked)
        assertEquals(VoiceStatus.Connected, r.voice.state.value.status)
    }

    @Test
    fun `a contacts request with no started activity is denied at once`() = runTest {
        val gate = ContactsPermissionGate(PermissionGateway(isGranted = { false }, sdk = 30))
        assertFalse("permission_denied well inside the agent's 8 s RPC timeout", gate.request())
        assertFalse(gate.pending.value)
        assertEquals(0L, currentTime)
    }

    @Test
    fun `a contacts dialog nobody answers times out as denied before the agent gives up`() = runTest {
        val gateway = PermissionGateway(isGranted = { false }, sdk = 30).also { it.attach(FakeAsker()) }
        val gate = ContactsPermissionGate(gateway)
        val answer = async { gate.request() }
        runCurrent()
        assertTrue(gate.pending.value)

        advanceTimeBy(ContactsPermissionGate.REQUEST_TIMEOUT_MS + 1)
        assertFalse(answer.await())
        assertFalse(gate.pending.value)
        assertTrue(ContactsPermissionGate.REQUEST_TIMEOUT_MS < 8_000)
    }

    @Test
    fun `a contacts request answered by the activity returns its result`() = runTest {
        val gateway = PermissionGateway(isGranted = { false }, sdk = 30).also { it.attach(FakeAsker()) }
        val gate = ContactsPermissionGate(gateway)
        val answer = async { gate.request() }
        runCurrent()
        gate.complete(true)
        assertTrue(answer.await())
    }
}
