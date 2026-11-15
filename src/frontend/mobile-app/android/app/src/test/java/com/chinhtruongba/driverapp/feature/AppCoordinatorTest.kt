package com.chinhtruongba.driverapp.feature

import com.chinhtruongba.driverapp.app.AppCoordinator
import com.chinhtruongba.driverapp.app.PermissionGateway
import com.chinhtruongba.driverapp.app.TripOfferStore
import com.chinhtruongba.driverapp.core.FakeTokenStore
import com.chinhtruongba.driverapp.core.data.DriverRepository
import com.chinhtruongba.driverapp.core.data.SessionRepository
import com.chinhtruongba.driverapp.core.model.AuthTokens
import com.chinhtruongba.driverapp.core.model.AuthUser
import com.chinhtruongba.driverapp.core.realtime.DispatchEvent
import com.chinhtruongba.driverapp.core.realtime.DispatchSocket
import com.chinhtruongba.driverapp.feature.location.LocationTracker
import com.chinhtruongba.driverapp.feature.voice.ChatStore
import com.chinhtruongba.driverapp.feature.voice.VoiceConnector
import com.chinhtruongba.driverapp.feature.voice.VoiceSession
import com.chinhtruongba.driverapp.feature.voice.VoiceStatus
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.advanceTimeBy
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class AppCoordinatorTest {
    private val phone = "0901234567"
    private val trip = FakeTripApi()
    private val engine = FakeEngine()
    private val chat = ChatStore()
    private val offers = TripOfferStore()
    private val frames = MutableSharedFlow<DispatchEvent>(extraBufferCapacity = 8)
    private val socket = object : DispatchSocket {
        override fun events(phone: String): Flow<DispatchEvent> = frames
    }

    private class Rig(val voice: VoiceSession, val drivers: DriverRepository, val gateway: PermissionGateway)

    private suspend fun TestScope.rig(micGranted: Boolean = true): Rig {
        val scope = backgroundScope
        val auth = FakeAuthApi(AuthUser(id = "a1", name = "Khoa", phone = phone, status = "online"))
        val session = SessionRepository(FakeTokenStore(AuthTokens("a", "r")), auth, trip, scope)
        val drivers = DriverRepository(trip, session, scope)
        val voice = VoiceSession(engine, drivers, FakePrefs(), NoFiller(), RecordingForeground(), FakeContacts(), chat, scope)
        val gateway = PermissionGateway(isGranted = { micGranted }, sdk = 30)
        val tracker = LocationTracker(FixedLocationSource(), drivers, session, scope)
        AppCoordinator(session, drivers, socket, offers, tracker, voice, chat, VoiceConnector(voice, gateway, session), scope).start()
        session.refreshMe()
        settle()
        return Rig(voice, drivers, gateway)
    }

    private fun TestScope.settle() {
        advanceTimeBy(2_000)
        runCurrent()
    }

    @Test
    fun `a nudge that arrives during a session connects once the session is idle again`() = runTest {
        val r = rig()
        r.voice.connect(phone)
        settle()
        assertEquals(VoiceStatus.Connected, r.voice.state.value.status)

        trip.context = trip.context.copy(hasPendingNudge = true)
        r.drivers.refresh()
        settle()
        assertEquals("not while a session is open", 1, engine.connects)

        r.voice.disconnect()
        settle()
        assertEquals("re-evaluated when voice returned to idle", 2, engine.connects)
        assertEquals(VoiceStatus.Connected, r.voice.state.value.status)
        assertTrue(chat.panelOpen.value)

        // Fired latch: the same nudge does not reconnect after this session ends.
        r.voice.disconnect()
        settle()
        assertEquals(2, engine.connects)
    }

    @Test
    fun `the nudge auto-connect asks for the microphone like every other connect`() = runTest {
        val r = rig(micGranted = false)
        val asker = FakeAsker { false }
        r.gateway.attach(asker)

        trip.context = trip.context.copy(hasPendingNudge = true)
        r.drivers.refresh()
        settle()

        assertEquals(1, asker.asked.size)
        assertEquals(VoiceStatus.Error, r.voice.state.value.status)
        assertEquals(0, engine.connects)
    }

    @Test
    fun `a nudge connect that waited for an activity is dropped when the nudge is gone`() = runTest {
        val r = rig(micGranted = false) // no activity: the microphone prompt has to wait
        trip.context = trip.context.copy(hasPendingNudge = true)
        r.drivers.refresh()
        settle()
        assertEquals(VoiceStatus.Idle, r.voice.state.value.status)

        // A second nudge while still in the background does not queue a second prompt.
        trip.context = trip.context.copy(hasPendingNudge = false)
        r.drivers.refresh()
        settle()
        trip.context = trip.context.copy(hasPendingNudge = true)
        r.drivers.refresh()
        settle()

        // Long after, the nudge was delivered another way; then the driver opens the app.
        trip.context = trip.context.copy(hasPendingNudge = false)
        r.drivers.refresh()
        settle()
        val asker = FakeAsker { true }
        r.gateway.attach(asker)
        settle()

        assertTrue("no microphone prompt out of context", asker.asked.isEmpty())
        assertEquals(VoiceStatus.Idle, r.voice.state.value.status)
        assertEquals(0, engine.connects)

        // The latch was re-armed: a new nudge with the app open asks and connects.
        trip.context = trip.context.copy(hasPendingNudge = true)
        r.drivers.refresh()
        settle()
        assertEquals(1, asker.asked.size)
        assertEquals(1, engine.connects)
    }

    @Test
    fun `socket open and schedule_updated re-check the ringing offer`() = runTest {
        rig()
        var revalidations = 0
        backgroundScope.launch { offers.revalidations.collect { revalidations++ } }
        runCurrent()

        frames.emit(DispatchEvent.Opened)
        runCurrent()
        assertEquals(1, revalidations)
        frames.emit(DispatchEvent.Message("schedule_updated", null))
        runCurrent()
        assertEquals(2, revalidations)
        frames.emit(DispatchEvent.Message("pending_nudge", null))
        runCurrent()
        assertEquals(2, revalidations)
    }
}
