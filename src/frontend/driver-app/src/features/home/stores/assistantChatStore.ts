import { create } from 'zustand'

export type ChatMessage = {
  who: 'me' | 'bot' | 'customer'
  msg: string
  /** True while this bubble is still following an in-progress STT/TTS stream. */
  streaming?: boolean
  /** LiveKit `lk.segment_id` — keeps interim/final chunks in one bubble. */
  segmentId?: string
}

function normalizeTranscript(text: string): string {
  return text
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[.!?…]+$/u, '')
    .toLowerCase()
}

function isGrowingTranscript(prev: string, next: string): boolean {
  const a = prev.trim()
  const b = next.trim()
  if (!a || !b) return false
  return b.startsWith(a) || a.startsWith(b)
}

function transcriptsEquivalent(prev: string, next: string): boolean {
  if (isGrowingTranscript(prev, next)) return true
  const a = normalizeTranscript(prev)
  const b = normalizeTranscript(next)
  return a.length > 0 && a === b
}

function findBubbleIndex(
  chats: ChatMessage[],
  who: ChatMessage['who'],
  msg: string,
  segmentId?: string,
): number {
  if (segmentId) {
    for (let i = chats.length - 1; i >= 0; i -= 1) {
      const bubble = chats[i]
      if (bubble.who === who && bubble.segmentId === segmentId) return i
    }
  }

  const last = chats[chats.length - 1]
  if (
    last?.who === who &&
    (last.streaming || transcriptsEquivalent(last.msg, msg))
  ) {
    return chats.length - 1
  }

  // Duplicate transcription stream (same utterance, new segment_id).
  for (let i = chats.length - 1; i >= 0 && chats.length - 1 - i < 4; i -= 1) {
    const bubble = chats[i]
    if (bubble.who !== who) break
    if (bubble.streaming || transcriptsEquivalent(bubble.msg, msg)) return i
  }

  return -1
}

function upsertStreamingChat(
  chats: ChatMessage[],
  who: ChatMessage['who'],
  msg: string,
  isFinal: boolean,
  segmentId?: string,
): ChatMessage[] {
  const idx = findBubbleIndex(chats, who, msg, segmentId)
  const bubble: ChatMessage = {
    who,
    msg,
    streaming: !isFinal,
    ...(segmentId ? { segmentId } : {}),
  }
  if (idx >= 0) {
    const prev = chats[idx]
    const next: ChatMessage = {
      ...bubble,
      segmentId: segmentId ?? prev.segmentId,
    }
    if (
      prev.msg === next.msg &&
      prev.streaming === next.streaming &&
      prev.who === next.who &&
      (prev.segmentId ?? '') === (next.segmentId ?? '')
    ) {
      return chats
    }
    return [...chats.slice(0, idx), next, ...chats.slice(idx + 1)]
  }
  return [...chats, bubble]
}

interface AssistantChatState {
  /** Full-screen chat overlay — opened on assistant tap or Home chat button. */
  panelOpen: boolean
  openPanel: () => void
  closePanel: () => void
  chats: ChatMessage[]
  addUserMessage: (msg: string) => void
  addBotMessage: (msg: string) => void
  upsertStreamingMessage: (
    who: ChatMessage['who'],
    msg: string,
    isFinal: boolean,
    segmentId?: string,
  ) => void
}

// Global (not component-local) so the conversation survives navigating away
// from the home tab and back, same as the voice session it's paired with.
// Start empty — bot bubbles come from live STT/TTS via useCaptureVoiceMessages.
export const useAssistantChatStore = create<AssistantChatState>(set => ({
  panelOpen: false,
  openPanel: () => set({ panelOpen: true }),
  closePanel: () => set({ panelOpen: false }),
  chats: [],
  addUserMessage: (msg: string) => set(prev => ({ chats: [...prev.chats, { who: 'me', msg }] })),
  addBotMessage: (msg: string) => set(prev => ({ chats: [...prev.chats, { who: 'bot', msg }] })),
  upsertStreamingMessage: (who, msg, isFinal, segmentId) =>
    set(prev => ({
      chats: upsertStreamingChat(prev.chats, who, msg, isFinal, segmentId),
    })),
}))
