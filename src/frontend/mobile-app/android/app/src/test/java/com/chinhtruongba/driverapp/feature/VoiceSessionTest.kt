package com.chinhtruongba.driverapp.feature

import app.cash.turbine.test
import com.chinhtruongba.driverapp.core.data.DriverRepository
import com.chinhtruongba.driverapp.core.data.SessionRepository
import com.chinhtruongba.driverapp.core.FakeTokenStore
import com.chinhtruongba.driverapp.core.model.AuthTokens
import com.chinhtruongba.driverapp.feature.voice.ChatStore
import com.chinhtruongba.driverapp.feature.voice.Speaker
import com.chinhtruongba.driverapp.feature.voice.VoiceSession
import com.chinhtruongba.driverapp.feature.voice.VoiceStatus
import com.chinhtruongba.driverapp.feature.voice.VoiceTopics
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.advanceTimeBy
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/** Background work (backgroundScope) is not covered by advanceUntilIdle; step the clock instead. */
private fun TestScope.settle() {
    advanceTimeBy(2_000)
    runCurrent()
}

class VoiceSessionTest {
    private fun TestScope.session(engine: FakeEngine, chat: ChatStore, fg: RecordingForeground = RecordingForeground()): VoiceSession {
        val scope = backgroundScope
        val tokens = FakeTokenStore(AuthTokens("a", "r"))
        val trip = FakeTripApi()
        val sessionRepo = SessionRepository(tokens, FakeAuthApi(), trip, scope)
        val drivers = DriverRepository(trip, sessionRepo, scope)
        return VoiceSession(engine, drivers, FakePrefs(), NoFiller(), fg, FakeContacts(), chat, scope)
    }

    @Test
    fun `connect streams transcripts into one bubble and user hang-up returns home`() = runTest {
        val engine = FakeEngine()
        val chat = ChatStore()
        val fg = RecordingForeground()
        val voice = session(engine, chat, fg)

        voice.state.test {
            assertEquals(VoiceStatus.Idle, awaitItem().status)
            voice.connect("0901234567")
            assertEquals(VoiceStatus.Connecting, awaitItem().status)
            settle()
            assertEquals(VoiceStatus.Connected, expectMostRecentItem().status)
            assertEquals(1, fg.calls)

            val l = engine.listener!!
            l.onText("agent-1", false, VoiceTopics.TRANSCRIPTION, "s1", "Chào", false)
            l.onText("agent-1", false, VoiceTopics.TRANSCRIPTION, "s1", "Chào anh", true)
            l.onText("agent-1", false, VoiceTopics.TRANSCRIPTION, "s2", "search_contacts", true)
            settle()
            assertEquals(1, chat.chats.value.size)
            assertEquals(Speaker.Bot, chat.chats.value[0].who)
            assertEquals("Chào anh", chat.chats.value[0].msg)
            assertFalse(chat.chats.value[0].streaming)

            voice.returnHome.test {
                chat.openPanel()
                voice.disconnect(userInitiated = true)
                settle()
                awaitItem()
            }
            assertEquals(VoiceStatus.Idle, expectMostRecentItem().status)
            assertFalse(chat.panelOpen.value)
            assertEquals(0, fg.calls)
        }
    }

    @Test
    fun `call state, bridge transcripts and cancel control`() = runTest {
        val engine = FakeEngine()
        val voice = session(engine, ChatStore())
        voice.connect("0901234567")
        settle()
        val l = engine.listener!!
        l.onData(VoiceTopics.CALL_STATE, """{"type":"call_state","active":true,"mode":"bridge"}""".encodeToByteArray())
        assertTrue(voice.state.value.isCallActive)
        assertEquals("bridge", voice.state.value.callMode)

        l.onText("customer-0909", false, VoiceTopics.TRANSCRIPTION, "c1", "Alo anh ơi", true)
        settle()
        assertEquals(VoiceTopics.CALL_TRANSCRIPT to """{"speaker":"customer","text":"Alo anh ơi"}""", engine.published.single())

        assertTrue(voice.cancelCall())
        assertEquals(VoiceTopics.CALL_CONTROL to """{"action":"cancel"}""", engine.published.last())

        l.onData(VoiceTopics.AGENT_STATE, """{"type":"agent_state","state":"thinking"}""".encodeToByteArray())
        assertTrue(voice.state.value.agentSpeaking)
        val rpc = l.onRpc(VoiceTopics.RPC_SEARCH_CONTACTS, """{"query":"me"}""")
        assertEquals("""{"matches":[{"name":"Mẹ","phone_number":"0912000111"}]}""", rpc)
    }

    @Test
    fun `sendText returns false when the engine throws`() = runTest {
        val engine = FakeEngine()
        val voice = session(engine, ChatStore())
        assertFalse("not connected", voice.sendText("idle"))
        voice.connect("0901234567")
        settle()
        assertEquals(VoiceStatus.Connected, voice.state.value.status)
        assertTrue(voice.sendText("xin chào"))
        engine.failSendText = true
        assertFalse(voice.sendText("xin chào"))
    }

    @Test
    fun `mic permission denied on connect ends in Error, not Connected`() = runTest {
        val engine = FakeEngine()
        val fg = RecordingForeground()
        val voice = session(engine, ChatStore(), fg)
        voice.connect("0901234567", micGranted = false)
        settle()
        assertEquals(VoiceStatus.Error, voice.state.value.status)
        assertFalse("no room joined without a mic", engine.connected)
        assertEquals(0, fg.calls)
    }

    @Test
    fun `a mic the engine cannot enable ends in Error and leaves the room`() = runTest {
        val engine = FakeEngine().apply { micAvailable = false }
        val fg = RecordingForeground()
        val voice = session(engine, ChatStore(), fg)
        voice.connect("0901234567")
        settle()
        assertEquals(VoiceStatus.Error, voice.state.value.status)
        assertFalse(engine.connected)
        assertTrue("no foreground call left running", fg.calls < 1)
    }
}
