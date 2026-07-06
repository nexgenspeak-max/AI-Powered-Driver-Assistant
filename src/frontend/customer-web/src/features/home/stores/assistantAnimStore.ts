import { create } from 'zustand'

export type AssistantState = 'idle' | 'thinking' | 'speaking' | 'listening'
export type AssistantEmotion = 'neutral' | 'happy' | 'sad' | 'excited' | 'serious'

interface AssistantAnimState {
  state: AssistantState
  emotion: AssistantEmotion
  setState: (state: AssistantState) => void
  setEmotion: (emotion: AssistantEmotion) => void
}

export const useAssistantAnimStore = create<AssistantAnimState>()(set => ({
  state: 'idle',
  emotion: 'neutral',
  setState: state => set(prev => (prev.state === state ? prev : { ...prev, state })),
  setEmotion: emotion => set(prev => (prev.emotion === emotion ? prev : { ...prev, emotion })),
}))
