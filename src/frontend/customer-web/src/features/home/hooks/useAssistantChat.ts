import { useCallback, useState } from 'react'

export type ChatMessage = {
  who: 'me' | 'bot'
  msg: string
}

const INITIAL_MESSAGE: ChatMessage = { who: 'bot', msg: 'Xin chào! Mình có thể giúp gì cho bạn?' }

/**
 * Owns only the message list. Sending logic (stub vs. real-time voice
 * session) is orchestrated by the caller so this hook has no circular
 * dependency on useVoiceSession.
 */
export function useAssistantChat() {
  const [chats, setChats] = useState<ChatMessage[]>([INITIAL_MESSAGE])

  const addUserMessage = useCallback((msg: string) => {
    setChats(prev => [...prev, { who: 'me', msg }])
  }, [])

  const addBotMessage = useCallback((msg: string) => {
    setChats(prev => [...prev, { who: 'bot', msg }])
  }, [])

  return { chats, addUserMessage, addBotMessage }
}
