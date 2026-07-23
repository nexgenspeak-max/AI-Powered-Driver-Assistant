import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { secureTokenStorage } from '../utils/secureTokenStorage'

interface AuthState {
  accessToken: string | null
  refreshToken: string | null
  // SecureStore reads are async, unlike the old MMKV-backed store — the
  // root layout waits on this before deciding whether to route into (app)
  // or (auth), so it never flashes the login screen for an already-logged-in
  // customer while the token is still being read off disk.
  hasHydrated: boolean
  setTokens: (accessToken: string, refreshToken: string) => void
  setHasHydrated: (hasHydrated: boolean) => void
  logout: () => void
}

// Tokens only — the customer's profile is never written to disk. It's
// fetched via GET /auth/me (see features/auth/hooks/useCurrentUser.ts) and
// lives only in the React Query cache, which is memory-only and clears on
// app restart. This is a deliberate security choice, not an oversight: see
// secureTokenStorage.ts for why tokens specifically need Keychain/Keystore.
export const useAuthStore = create<AuthState>()(
  persist(
    set => ({
      accessToken: null,
      refreshToken: null,
      hasHydrated: false,
      setTokens: (accessToken, refreshToken) => set({ accessToken, refreshToken }),
      setHasHydrated: hasHydrated => set({ hasHydrated }),
      logout: () => set({ accessToken: null, refreshToken: null }),
    }),
    {
      name: 'customer-auth-tokens',
      storage: createJSONStorage(() => secureTokenStorage),
      // Only tokens are ever written to SecureStore — `hasHydrated` is
      // runtime-only state, persisting it would make it (wrongly) start
      // `true` on the very next app launch, before the real read completes.
      partialize: state => ({ accessToken: state.accessToken, refreshToken: state.refreshToken }),
      onRehydrateStorage: () => state => state?.setHasHydrated(true),
    },
  ),
)
