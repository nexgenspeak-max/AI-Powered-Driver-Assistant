import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { storage } from '../../utils/storage'

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
