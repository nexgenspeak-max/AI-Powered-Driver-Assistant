package com.chinhtruongba.driverapp.feature

import com.chinhtruongba.driverapp.app.PermissionQueue
import com.chinhtruongba.driverapp.feature.home.GoongTileRepairer
import com.chinhtruongba.driverapp.feature.home.VectorTileRepair
import com.chinhtruongba.driverapp.feature.voice.VoiceState
import com.chinhtruongba.driverapp.feature.voice.VoiceStatus
import com.chinhtruongba.driverapp.feature.voice.ui.OrbAction
import com.chinhtruongba.driverapp.feature.voice.ui.orbActionFor
import com.chinhtruongba.driverapp.feature.wakeword.WakeWordRules
import okhttp3.HttpUrl.Companion.toHttpUrl
import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.ByteArrayOutputStream
import java.util.zip.GZIPOutputStream
import kotlin.random.Random

private const val FINE = "android.permission.ACCESS_FINE_LOCATION"
private const val CONTACTS = "android.permission.READ_CONTACTS"

private fun gzip(b: ByteArray) = ByteArrayOutputStream().also { o -> GZIPOutputStream(o).use { it.write(b) } }.toByteArray()

class TileRepairHardeningTest {
    @Test
    fun `gunzip stops at the limit instead of inflating a bomb`() {
        val bomb = gzip(ByteArray(4 * 1024 * 1024)) // 4 MB of zeros, a few KB compressed
        assertTrue("the fixture really is small on the wire", bomb.size < 64 * 1024)
        assertNull(VectorTileRepair.gunzip(bomb, limit = 1024 * 1024))
        assertEquals(4 * 1024 * 1024, VectorTileRepair.gunzip(bomb, limit = 4 * 1024 * 1024)?.size)
    }

    @Test
    fun `an oversized gzip tile is left unrepaired`() {
        val bomb = gzip(ByteArray(VectorTileRepair.MAX_INFLATED_BYTES + 1))
        assertNull(VectorTileRepair.repairMaybeGzipped(bomb))
    }

    @Test
    fun `gunzip round-trips ordinary data and rejects corrupt gzip`() {
        val data = Random(7).nextBytes(50_000)
        assertArrayEquals(data, VectorTileRepair.gunzip(gzip(data)))
        assertNull(VectorTileRepair.gunzip(gzip(data).copyOf(100)))
    }

    @Test
    fun `only goong_io and its subdomains count as Goong`() {
        fun repair(url: String) = GoongTileRepairer.shouldRepair(url.toHttpUrl())
        assertTrue(repair("https://tiles.goong.io/tiles/composite/1/2/3.pbf"))
        assertTrue(repair("https://goong.io/tiles/composite/1/2/3.pbf"))
        assertFalse(repair("https://evilgoong.io/tiles/composite/1/2/3.pbf"))
        assertFalse(repair("https://goong.io.example.com/tiles/composite/1/2/3.pbf"))
    }

    @Test
    fun `the tile parser never throws on arbitrary bytes`() {
        val random = Random(20261115)
        repeat(2_000) {
            val bytes = random.nextBytes(random.nextInt(0, 400))
            // Any outcome but an exception is fine: null (not repaired) or a rewritten tile.
            VectorTileRepair.repair(bytes)
            VectorTileRepair.repairMaybeGzipped(bytes)
            VectorTileRepair.repairMaybeGzipped(gzip(bytes))
        }
    }
}

class PermissionQueueRecreationTest {
    @Test
    fun `a result delivered after the activity is recreated still answers the first caller`() {
        val granted = mutableSetOf<String>()
        val oldLauncher = mutableListOf<List<String>>()
        val newLauncher = mutableListOf<List<String>>()
        val queue = PermissionQueue(launch = { oldLauncher += it.toList() }, isGranted = { it in granted })
        var location: Map<String, Boolean>? = null
        var contacts: Map<String, Boolean>? = null
        queue.request(arrayOf(FINE)) { location = it }
        queue.request(arrayOf(CONTACTS)) { contacts = it }
        assertEquals(listOf(listOf(FINE)), oldLauncher)

        // Rotation: a new activity registers a new launcher; the dialog's result comes to it.
        queue.attach { newLauncher += it.toList() }
        assertTrue("the request in flight is not launched twice", newLauncher.isEmpty())
        queue.onResult(mapOf(FINE to true))

        assertEquals(mapOf(FINE to true), location)
        assertEquals("the waiting request goes to the new launcher", listOf(listOf(CONTACTS)), newLauncher)
        assertEquals("the old launcher is not used again", 1, oldLauncher.size)
        queue.onResult(mapOf(CONTACTS to true))
        assertEquals(mapOf(CONTACTS to true), contacts)
    }
}

class OrbActionTest {
    private fun state(status: VoiceStatus, call: Boolean = false) = VoiceState(status = status, isCallActive = call)

    @Test
    fun `a tap while connecting does nothing`() {
        assertEquals(OrbAction.Ignore, orbActionFor(state(VoiceStatus.Connecting), panelOpen = false, phone = "0901234567"))
        assertEquals(OrbAction.Ignore, orbActionFor(state(VoiceStatus.Connecting), panelOpen = true, phone = null))
    }

    @Test
    fun `connected - closed panel opens it, open panel hangs up, an active call asks first`() {
        assertEquals(OrbAction.OpenPanel, orbActionFor(state(VoiceStatus.Connected), panelOpen = false, phone = "0901234567"))
        assertEquals(OrbAction.OpenPanel, orbActionFor(state(VoiceStatus.Connected, call = true), panelOpen = false, phone = "0901234567"))
        assertEquals(OrbAction.Disconnect, orbActionFor(state(VoiceStatus.Connected), panelOpen = true, phone = "0901234567"))
        assertEquals(OrbAction.ConfirmCancelCall, orbActionFor(state(VoiceStatus.Connected, call = true), panelOpen = true, phone = "0901234567"))
    }

    @Test
    fun `idle or error connects with the driver phone, or reports that it is missing`() {
        for (status in listOf(VoiceStatus.Idle, VoiceStatus.Error)) {
            assertEquals(OrbAction.Connect("0901234567"), orbActionFor(state(status), panelOpen = false, phone = "0901234567"))
            assertEquals(OrbAction.MissingPhone, orbActionFor(state(status), panelOpen = false, phone = null))
            assertEquals(OrbAction.MissingPhone, orbActionFor(state(status), panelOpen = true, phone = "  "))
        }
    }
}

class WakeWordRulesTest {
    @Test
    fun `the grammar is a JSON array of the wake phrase, the decoys and unk`() {
        val grammar = WakeWordRules.grammarJson()
        assertTrue(grammar.startsWith("[\"hey ai\","))
        assertTrue(grammar.endsWith(",\"[unk]\"]"))
        assertEquals(WakeWordRules.WAKE_PHRASES.size + WakeWordRules.DECOYS.size + 1, grammar.split(",").size)
    }

    @Test
    fun `the wake phrase matches in any case and inside a longer result, decoys do not`() {
        assertTrue(WakeWordRules.matchesWakePhrase("  Hey AI "))
        assertTrue(WakeWordRules.matchesWakePhrase("okay hey ai please"))
        assertFalse(WakeWordRules.matchesWakePhrase("hey"))
        assertFalse(WakeWordRules.matchesWakePhrase("hello"))
        assertFalse(WakeWordRules.matchesWakePhrase(""))
    }

    @Test
    fun `parse reads the text and the confidence, averaging per-word conf`() {
        assertEquals(WakeWordRules.Hypothesis("hey ai", 0.9), WakeWordRules.parse("""{"text":"hey ai","confidence":0.9}"""))
        val words = WakeWordRules.parse("""{"text":"hey ai","result":[{"conf":1.0,"word":"hey"},{"conf":0.8,"word":"ai"}]}""")
        assertEquals("hey ai", words.text)
        assertEquals(0.9, words.confidence!!, 1e-9)
        assertEquals(WakeWordRules.Hypothesis("hey ai", null), WakeWordRules.parse("""{"text":"hey ai"}"""))
        assertEquals("not JSON falls back to the raw text", WakeWordRules.Hypothesis("hey ai", null), WakeWordRules.parse("hey ai"))
    }

    @Test
    fun `a trigger needs the phrase and, when known, enough confidence`() {
        assertTrue(WakeWordRules.shouldTrigger(WakeWordRules.Hypothesis("hey ai", null)))
        assertTrue(WakeWordRules.shouldTrigger(WakeWordRules.Hypothesis("hey ai", WakeWordRules.MIN_CONFIDENCE)))
        assertFalse(WakeWordRules.shouldTrigger(WakeWordRules.Hypothesis("hey ai", 0.84)))
        assertFalse(WakeWordRules.shouldTrigger(WakeWordRules.Hypothesis("hey", 1.0)))
    }
}
