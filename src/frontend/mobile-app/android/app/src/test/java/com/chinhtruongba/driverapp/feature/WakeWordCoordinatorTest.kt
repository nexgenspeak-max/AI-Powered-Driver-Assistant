package com.chinhtruongba.driverapp.feature

import com.chinhtruongba.driverapp.app.PermissionGateway
import com.chinhtruongba.driverapp.core.FakeTokenStore
import com.chinhtruongba.driverapp.core.data.DriverRepository
import com.chinhtruongba.driverapp.core.data.SessionRepository
import com.chinhtruongba.driverapp.core.model.AuthTokens
import com.chinhtruongba.driverapp.feature.voice.ChatStore
import com.chinhtruongba.driverapp.feature.voice.VoiceConnector
import com.chinhtruongba.driverapp.feature.voice.VoiceSession
import com.chinhtruongba.driverapp.feature.voice.VoiceStatus
import com.chinhtruongba.driverapp.feature.wakeword.WakeEngine
import com.chinhtruongba.driverapp.feature.wakeword.WakeWordCoordinator
import com.chinhtruongba.driverapp.service.CzenForegroundService
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.advanceTimeBy
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

private class FakeWakeEngine : WakeEngine {
    var starts = 0
    var running = false
    var unloaded = false
    var listener: WakeEngine.Listener? = null

    /** Like Vosk: stopping a running recogniser still delivers a final result. */
    var finalResultOnStop = false
    override suspend fun start(listener: WakeEngine.Listener) {
        starts++
        running = true
        this.listener = listener
    }
    override fun stop() {
        val wasRunning = running
        running = false
        if (wasRunning && finalResultOnStop) listener?.onFinalResult()
    }
    override fun unload() {
        running = false
        unloaded = true
    }
}

class WakeWordCoordinatorTest {
    private class Rig(
        val engine: FakeWakeEngine,
        val fg: RecordingForeground,
        val prefs: FakePrefs,
        val voice: VoiceSession,
        val chat: ChatStore,
    )

    private suspend fun TestScope.rig(refuseService: Boolean = false): Rig {
        val scope = backgroundScope
        val trip = FakeTripApi()
        val session = SessionRepository(FakeTokenStore(AuthTokens("a", "r")), FakeAuthApi(), trip, scope)
        session.refreshMe()
        val drivers = DriverRepository(trip, session, scope)
        val prefs = FakePrefs().apply { wakeWordEnabled.value = true }
        val chat = ChatStore()
        val fg = RecordingForeground().apply { refuseWake = refuseService }
        val voice = VoiceSession(FakeEngine(), drivers, prefs, NoFiller(), fg, FakeContacts(), chat, scope)
        val gateway = PermissionGateway(isGranted = { true }, sdk = 34)
        val engine = FakeWakeEngine()
        WakeWordCoordinator(
            session = session,
            prefs = prefs,
            voice = voice,
            connector = VoiceConnector(voice, gateway, session),
            chat = chat,
            foreground = fg,
            permissions = gateway,
            scope = scope,
            engine = engine,
            micGranted = { true },
            bringToFront = { },
        ).start()
        advanceTimeBy(500)
        runCurrent()
        return Rig(engine, fg, prefs, voice, chat)
    }

    @Test
    fun `hands-free holds the foreground service across a call and releases it only when turned off`() = runTest {
        val r = rig()
        assertTrue(r.engine.running)
        assertTrue(r.fg.wake)

        r.voice.connect("0901234567")
        advanceTimeBy(2_000)
        runCurrent()
        assertEquals(VoiceStatus.Connected, r.voice.state.value.status)
        assertFalse("the recogniser pauses for the call", r.engine.running)
        assertTrue("the service is not released when the call starts", r.fg.wake)

        r.voice.disconnect()
        advanceTimeBy(2_000)
        runCurrent()
        assertTrue("listening resumes after the call", r.engine.running)
        assertTrue(r.fg.wake)

        r.prefs.wakeWordEnabled.value = false
        runCurrent()
        assertFalse(r.engine.running)
        assertTrue(r.engine.unloaded)
        assertFalse("turning hands-free off releases the service", r.fg.wake)
    }

    @Test
    fun `the recogniser is not started when the foreground service is refused`() = runTest {
        val r = rig(refuseService = true)
        advanceTimeBy(10_000)
        assertEquals(0, r.engine.starts)
        assertFalse(r.fg.wake)
    }

    @Test
    fun `a service the OS drops afterwards stops the recogniser`() = runTest {
        val r = rig()
        assertTrue(r.engine.running)
        r.fg.refusals.emit(CzenForegroundService.Reasons.WAKE)
        runCurrent()
        assertFalse(r.engine.running)
    }

    @Test
    fun `a refused service is retried on the backoff, not by the stopped recogniser's final result`() = runTest {
        val r = rig()
        r.engine.finalResultOnStop = true
        r.fg.refusals.emit(CzenForegroundService.Reasons.WAKE)
        runCurrent()
        assertFalse(r.engine.running)

        advanceTimeBy(900) // the 300 ms restart of a final result would have fired by now
        runCurrent()
        assertEquals("no quick restart loop", 1, r.engine.starts)

        advanceTimeBy(200) // first backoff step: 1 s
        runCurrent()
        assertEquals(2, r.engine.starts)
    }

    @Test
    fun `a restart soon after a stop keeps listening and still reacts to the wake phrase`() = runTest {
        val r = rig()
        r.engine.listener!!.onTimeout() // stop, then restart 300 ms later
        advanceTimeBy(301)
        runCurrent()
        assertEquals(2, r.engine.starts)
        assertTrue(r.engine.running)

        advanceTimeBy(5_000) // past the old 2.5 s stop watchdog
        runCurrent()
        assertTrue(r.engine.running)
        assertEquals("no second recogniser was started on top", 2, r.engine.starts)

        r.engine.listener!!.onResult("""{"text":"hey ai"}""")
        runCurrent()
        assertTrue("the wake phrase opens the assistant", r.chat.panelOpen.value)
        assertEquals(VoiceStatus.Connecting, r.voice.state.value.status)
    }
}
