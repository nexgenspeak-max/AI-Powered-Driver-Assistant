import axios from 'axios'
import { useAuthStore } from '../../stores/authStore'

// Bare axios call (not the `authClient` instance) so this module has no
// dependency on authClient.ts/auth.ts — both of those need to call *this*
// module's refreshAccessToken() from their own response interceptors, and a
// two-way import would be circular.
const AUTH_BASE = process.env.EXPO_PUBLIC_IDENTITY_SERVICE_URL ?? process.env.EXPO_PUBLIC_AUTH_SERVICE_URL ?? 'http://localhost:8003/api/v1'

let refreshing: Promise<string | null> | null = null

/** Shared by apiClient (trip-service) and authClient (auth-service) so a 401
 * on either one triggers at most one in-flight refresh — refresh tokens are
 * rotated server-side, so two concurrent refresh calls would have the second
 * one fail against an already-consumed token. */
export function refreshAccessToken(): Promise<string | null> {
  refreshing ??= (async () => {
    const { refreshToken, setTokens, logout } = useAuthStore.getState()
    if (!refreshToken) {
      logout()
      return null
    }
    try {
      const { data } = await axios.post(`${AUTH_BASE}/auth/refresh`, { refresh_token: refreshToken })
      setTokens(data.access_token, data.refresh_token)
      return data.access_token as string
    } catch {
      logout()
      return null
    }
  })().finally(() => { refreshing = null })
  return refreshing
}
