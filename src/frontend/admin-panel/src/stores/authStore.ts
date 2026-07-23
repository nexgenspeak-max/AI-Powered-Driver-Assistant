import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Admin } from '../types/auth'

interface AuthState {
  admin: Admin | null
  accessToken: string | null
  refreshToken: string | null
  setAdmin: (admin: Admin) => void
  setTokens: (accessToken: string, refreshToken: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    set => ({
      admin: null,
      accessToken: null,
      refreshToken: null,
      setAdmin: admin => set({ admin }),
      setTokens: (accessToken, refreshToken) => set({ accessToken, refreshToken }),
      logout: () => set({ admin: null, accessToken: null, refreshToken: null }),
    }),
    { name: 'admin-auth' },
  ),
)
