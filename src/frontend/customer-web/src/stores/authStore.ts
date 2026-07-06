import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {Customer} from '../types'

interface AuthState {
  customer: Customer | null
  accessToken: string | null
  refreshToken: string | null
  setCustomer: (customer: Customer) => void
  setTokens: (accessToken: string, refreshToken: string) => void
  logout: () => void
}
export const useAuthStore = create<AuthState>()(
  persist(
    set => ({
        customer: null,
        accessToken: null,
        refreshToken: null,
        setCustomer: customer => set({ customer }),
        setTokens: (accessToken, refreshToken) => set({ accessToken, refreshToken }),
        logout: () => set({ customer: null, accessToken: null, refreshToken: null }),
    }),
    { name: 'customer-auth' },
  ),
)
