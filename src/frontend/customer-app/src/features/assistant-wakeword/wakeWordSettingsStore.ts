import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { storage } from '../../utils/storage'

// TEMP: wake-word (always-on background listening) locked off for this
// build — not needed yet. Flip back to true to re-enable; everything else
// (the store, the Profile switch, enableWakeWord/disableWakeWord) is
// untouched, this is the single point that overrides it regardless of
// whatever the user previously had saved.
export const WAKE_WORD_FEATURE_ENABLED = false

interface WakeWordSettingsState {
  enabled: boolean
  setEnabled: (enabled: boolean) => void
}

// Opt-in, defaults to off — always-on background listening costs battery and
// needs the customer's explicit consent to keep the mic open in the background.
export const useWakeWordSettingsStore = create<WakeWordSettingsState>()(
  persist(
    set => ({
      enabled: false,
      setEnabled: enabled => set({ enabled }),
    }),
    {
      name: 'wakeword-settings',
      storage: createJSONStorage(() => storage),
    },
  ),
)
