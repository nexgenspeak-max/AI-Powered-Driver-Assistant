import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { OpsUser } from '../types/auth'

interface AuthState {
  user: OpsUser | null
  accessToken: string | null
  refreshToken: string | null
  setUser: (user: OpsUser) => void
  setTokens: (accessToken: string, refreshToken: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    set => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      setUser: user => set({ user }),
      setTokens: (accessToken, refreshToken) => set({ accessToken, refreshToken }),
      logout: () => set({ user: null, accessToken: null, refreshToken: null }),
    }),
    { name: 'super-admin-auth' },
  ),
)
