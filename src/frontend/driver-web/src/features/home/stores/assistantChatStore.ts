import { create } from 'zustand'

export type ChatMessage = {
  who: 'me' | 'bot'
  msg: string
}

const INITIAL_MESSAGE: ChatMessage = { who: 'bot', msg: 'Xin chào! Mình có thể giúp gì cho bạn?' }

interface AssistantChatState {
  chats: ChatMessage[]
  addUserMessage: (msg: string) => void
  addBotMessage: (msg: string) => void
}

// Global (not component-local) so the conversation survives navigating away
// from the home page and back, same as the voice session it's paired with.
export const useAssistantChatStore = create<AssistantChatState>(set => ({
  chats: [INITIAL_MESSAGE],
  addUserMessage: (msg: string) => set(prev => ({ chats: [...prev.chats, { who: 'me', msg }] })),
  addBotMessage: (msg: string) => set(prev => ({ chats: [...prev.chats, { who: 'bot', msg }] })),
}))
