import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { storage } from '../../utils/storage'
import {
  DEFAULT_VOICE_ROUTING_LANG,
  resolveVoiceRoutingLang,
  type VoiceRoutingLang,
} from './locales'

interface VoiceLangState {
  /** User-chosen assistant language (not device locale). */
  lang: VoiceRoutingLang
  setLang: (lang: VoiceRoutingLang) => void
}

export const useVoiceLangStore = create<VoiceLangState>()(
  persist(
    set => ({
      lang: DEFAULT_VOICE_ROUTING_LANG,
      setLang: lang => set({ lang: resolveVoiceRoutingLang(lang) }),
    }),
    {
      name: 'voice-lang-settings',
      version: 1,
      storage: createJSONStorage(() => storage),
      migrate: persisted => {
        const state = (persisted ?? {}) as Partial<VoiceLangState>
        return {
          lang: resolveVoiceRoutingLang(state.lang),
        }
      },
    },
  ),
)

/** Read lang outside React (e.g. voiceSessionStore connect). */
export function getVoiceRoutingLang(): VoiceRoutingLang {
  return resolveVoiceRoutingLang(useVoiceLangStore.getState().lang)
}

export type { VoiceRoutingLang } from './locales'
