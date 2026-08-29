import { create } from 'zustand'

export type ChatMessage = {
  who: 'me' | 'bot'
  msg: string
  streaming?: boolean
  segmentId?: string
}

const INITIAL_MESSAGE: ChatMessage = { who: 'bot', msg: 'Xin chào! Mình có thể giúp gì cho bạn?' }

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
    return [
      ...chats.slice(0, idx),
      {
        ...bubble,
        segmentId: segmentId ?? prev.segmentId,
      },
      ...chats.slice(idx + 1),
    ]
  }
  return [...chats, bubble]
}

interface AssistantChatState {
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

export const useAssistantChatStore = create<AssistantChatState>(set => ({
  chats: [INITIAL_MESSAGE],
  addUserMessage: (msg: string) => set(prev => ({ chats: [...prev.chats, { who: 'me', msg }] })),
  addBotMessage: (msg: string) => set(prev => ({ chats: [...prev.chats, { who: 'bot', msg }] })),
  upsertStreamingMessage: (who, msg, isFinal, segmentId) =>
    set(prev => ({
      chats: upsertStreamingChat(prev.chats, who, msg, isFinal, segmentId),
    })),
}))
