import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Driver } from '../types'

interface AuthState {
  driver: Driver | null
  accessToken: string | null
  refreshToken: string | null
  setDriver: (driver: Driver) => void
  setTokens: (accessToken: string, refreshToken: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    set => ({
      driver: null,
      accessToken: null,
      refreshToken: null,
      setDriver: driver => set({ driver }),
      setTokens: (accessToken, refreshToken) => set({ accessToken, refreshToken }),
      logout: () => set({ driver: null, accessToken: null, refreshToken: null }),
    }),
    { name: 'driver-auth' },
  ),
)
