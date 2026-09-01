import { useAuthStore } from '../../stores/authStore'
import { authService } from './auth'

let refreshing: Promise<string | null> | null = null

export async function refreshAccessToken(): Promise<string | null> {
  if (refreshing) return refreshing
  refreshing = (async () => {
    const { refreshToken, setTokens, logout } = useAuthStore.getState()
    if (!refreshToken) {
      logout()
      return null
    }
    try {
      const tokens = await authService.refresh(refreshToken)
      setTokens(tokens.access_token, tokens.refresh_token)
      return tokens.access_token
    } catch {
      logout()
      return null
    }
  })().finally(() => { refreshing = null })
  return refreshing
}
