package com.chinhtruongba.driverapp.feature

import com.chinhtruongba.driverapp.feature.voice.ChatMessage
import com.chinhtruongba.driverapp.feature.voice.FinalDeduper
import com.chinhtruongba.driverapp.feature.voice.Speaker
import com.chinhtruongba.driverapp.feature.voice.TranscriptMerge
import com.chinhtruongba.driverapp.feature.voice.VoiceFilters
import com.chinhtruongba.driverapp.feature.voice.VoiceSource
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertSame
import org.junit.Assert.assertTrue
import org.junit.Test

class TranscriptMergeTest {
    private fun up(c: List<ChatMessage>, who: Speaker, msg: String, final: Boolean, seg: String? = null) =
        TranscriptMerge.upsert(c, who, msg, final, seg)

    @Test fun `interim chunks of one segment grow a single bubble`() {
        var c = up(emptyList(), Speaker.Bot, "Chào", false, "s1")
        c = up(c, Speaker.Bot, "Chào anh", false, "s1")
        c = up(c, Speaker.Bot, "Chào anh Khoa!", true, "s1")
        assertEquals(listOf(ChatMessage(Speaker.Bot, "Chào anh Khoa!", streaming = false, segmentId = "s1")), c)
    }

    @Test fun `a new segment from another speaker starts a new bubble`() {
        var c = up(emptyList(), Speaker.Bot, "Xin chào", true, "s1")
        c = up(c, Speaker.Me, "Lịch hôm nay", true)
        c = up(c, Speaker.Bot, "Anh có 2 chuyến", false, "s2")
        assertEquals(3, c.size)
        assertEquals(Speaker.Bot, c[2].who)
        assertTrue(c[2].streaming)
    }

    @Test fun `duplicate stream with a new segment id merges into the equivalent bubble`() {
        var c = up(emptyList(), Speaker.Bot, "Em gọi chị Hà nhé.", true, "s1")
        c = up(c, Speaker.Bot, "em gọi chị hà nhé", true, "s9")
        assertEquals(1, c.size)
        assertEquals("s9", c[0].segmentId)
    }

    @Test fun `the lk chat echo of a sent message does not duplicate the me bubble`() {
        var c = up(emptyList(), Speaker.Me, "Gọi khách", true)
        val again = up(c, Speaker.Me, "Gọi khách", true)
        assertSame(c, again)
        c = up(c, Speaker.Me, "Thu nhập hôm nay", true)
        assertEquals(2, c.size)
    }

    @Test fun `normalization ignores case, spaces and trailing punctuation`() {
        assertEquals("xin chao ban", TranscriptMerge.normalize("  Xin   chao BAN...! "))
        assertTrue(TranscriptMerge.equivalent("Xin chào.", "xin chào"))
        assertTrue(TranscriptMerge.isGrowing("Xin", "Xin chào"))
        assertFalse(TranscriptMerge.equivalent("Có", "Không"))
    }

    @Test fun `raw tool ids are hidden, sentences are not`() {
        assertTrue(VoiceFilters.isRawToolToken("search_contacts"))
        assertFalse(VoiceFilters.isRawToolToken("hello"))
        assertFalse(VoiceFilters.isRawToolToken("search contacts now"))
        assertFalse(VoiceFilters.isRawToolToken("Search_contacts"))
    }

    @Test fun `final transcripts repeating within 3 s are dropped`() {
        val d = FinalDeduper()
        val k = VoiceFilters.dedupKey(VoiceSource.Agent, "Đã nhận chuyến.")
        assertTrue(d.accept(k, 1_000))
        assertFalse(d.accept(VoiceFilters.dedupKey(VoiceSource.Agent, "đã nhận chuyến"), 2_500))
        assertTrue(d.accept(k, 4_100))
        assertTrue(d.accept(VoiceFilters.dedupKey(VoiceSource.User, "Đã nhận chuyến."), 4_200))
    }

    @Test fun `speaker resolution`() {
        assertEquals(VoiceSource.User, VoiceFilters.sourceOf(true, "driver-1", false))
        assertEquals(VoiceSource.Customer, VoiceFilters.sourceOf(false, "Customer-0909", true))
        assertEquals(VoiceSource.Agent, VoiceFilters.sourceOf(false, "customer-0909", false))
        assertEquals(VoiceSource.Agent, VoiceFilters.sourceOf(false, "agent-x", true))
    }
}
