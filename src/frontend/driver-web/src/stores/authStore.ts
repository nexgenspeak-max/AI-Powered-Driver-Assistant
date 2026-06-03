import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Driver } from '../types'

interface AuthState {
  driver: Driver | null
  setDriver: (driver: Driver) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    set => ({
      driver: null,
      setDriver: driver => set({ driver }),
      logout: () => set({ driver: null }),
    }),
    { name: 'driver-auth' },
  ),
)
