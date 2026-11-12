package com.chinhtruongba.driverapp.feature.voice

import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import javax.inject.Inject
import javax.inject.Singleton

enum class Speaker { Me, Bot, Customer }

data class ChatMessage(
    val who: Speaker,
    val msg: String,
    /** True while this bubble still follows an in-progress STT/TTS stream. */
    val streaming: Boolean = false,
    /** LiveKit `lk.segment_id` — keeps interim/final chunks in one bubble. */
    val segmentId: String? = null,
)

/** Transcript merge rules from assistantChatStore.ts, kept pure for unit tests. */
object TranscriptMerge {
    private val spaces = Regex("\\s+")
    private val trailingPunct = Regex("[.!?…]+$")

    fun normalize(text: String): String = text.trim().replace(spaces, " ").replace(trailingPunct, "").lowercase()

    fun isGrowing(prev: String, next: String): Boolean {
        val a = prev.trim()
        val b = next.trim()
        if (a.isEmpty() || b.isEmpty()) return false
        return b.startsWith(a) || a.startsWith(b)
    }

    fun equivalent(prev: String, next: String): Boolean {
        if (isGrowing(prev, next)) return true
        val a = normalize(prev)
        return a.isNotEmpty() && a == normalize(next)
    }

    fun findBubbleIndex(chats: List<ChatMessage>, who: Speaker, msg: String, segmentId: String?): Int {
        if (segmentId != null) {
            for (i in chats.indices.reversed()) {
                val b = chats[i]
                if (b.who == who && b.segmentId == segmentId) return i
            }
        }
        val last = chats.lastOrNull()
        if (last != null && last.who == who && (last.streaming || equivalent(last.msg, msg))) return chats.lastIndex
        // Duplicate transcription stream (same utterance, new segment_id) within the last 4 bubbles.
        var i = chats.lastIndex
        while (i >= 0 && chats.lastIndex - i < 4) {
            val b = chats[i]
            if (b.who != who) break
            if (b.streaming || equivalent(b.msg, msg)) return i
            i--
        }
        return -1
    }

    fun upsert(chats: List<ChatMessage>, who: Speaker, msg: String, isFinal: Boolean, segmentId: String?): List<ChatMessage> {
        val idx = findBubbleIndex(chats, who, msg, segmentId)
        val bubble = ChatMessage(who, msg, streaming = !isFinal, segmentId = segmentId)
        if (idx >= 0) {
            val prev = chats[idx]
            val next = bubble.copy(segmentId = segmentId ?: prev.segmentId)
            if (prev.msg == next.msg && prev.streaming == next.streaming && prev.who == next.who && (prev.segmentId ?: "") == (next.segmentId ?: "")) {
                return chats
            }
            return chats.toMutableList().also { it[idx] = next }
        }
        return chats + bubble
    }
}

/** In-memory conversation + panel visibility (assistantChatStore). Survives tab switches. */
@Singleton
class ChatStore @Inject constructor() {
    private val _panelOpen = MutableStateFlow(false)
    val panelOpen: StateFlow<Boolean> = _panelOpen.asStateFlow()
    private val _chats = MutableStateFlow<List<ChatMessage>>(emptyList())
    val chats: StateFlow<List<ChatMessage>> = _chats.asStateFlow()

    fun openPanel() { _panelOpen.value = true }
    fun closePanel() { _panelOpen.value = false }
    fun addUserMessage(msg: String) = _chats.update { it + ChatMessage(Speaker.Me, msg) }
    fun addBotMessage(msg: String) = _chats.update { it + ChatMessage(Speaker.Bot, msg) }
    fun upsertStreaming(who: Speaker, msg: String, isFinal: Boolean, segmentId: String? = null) =
        _chats.update { TranscriptMerge.upsert(it, who, msg, isFinal, segmentId) }
    fun clear() { _chats.value = emptyList() }
}
