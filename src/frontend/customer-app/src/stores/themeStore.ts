import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { storage } from '../utils/storage'

export type ThemeMode = 'light' | 'dark'

interface ThemeState {
  mode: ThemeMode
  setMode: (mode: ThemeMode) => void
  toggle: () => void
}

// Defaults to dark — matches the app's primary visual identity; user can
// switch to light from Profile at any time, choice persists across launches.
export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      mode: 'dark',
      setMode: mode => set({ mode }),
      toggle: () => set({ mode: get().mode === 'dark' ? 'light' : 'dark' }),
    }),
    {
      name: 'theme-settings',
      storage: createJSONStorage(() => storage),
    },
  ),
)
