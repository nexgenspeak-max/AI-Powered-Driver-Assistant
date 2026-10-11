import axios, { type InternalAxiosRequestConfig } from 'axios'
import { useAuthStore } from '../../stores/authStore'
import { authService } from './auth'

export const opsBaseURL = import.meta.env.VITE_OPS_SERVICE_URL ?? 'http://localhost:8004'

export const opsClient = axios.create({
  baseURL: opsBaseURL,
  headers: { 'Content-Type': 'application/json' },
})

opsClient.interceptors.request.use(config => {
  const accessToken = useAuthStore.getState().accessToken
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`
  return config
})

let refreshing: Promise<string | null> | null = null

async function refreshAccessToken(): Promise<string | null> {
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
}

/** One refresh shared by every caller that hit 401 at the same time. */
export function refreshAccessTokenOnce(): Promise<string | null> {
  refreshing ??= refreshAccessToken().finally(() => { refreshing = null })
  return refreshing
}

opsClient.interceptors.response.use(
  response => response,
  async error => {
    const status = error.response?.status
    const original = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined
    if (status === 401 && original && !original._retry && useAuthStore.getState().refreshToken) {
      original._retry = true
      const newAccessToken = await refreshAccessTokenOnce()
      if (newAccessToken) {
        original.headers.Authorization = `Bearer ${newAccessToken}`
        return opsClient.request(original)
      }
      window.location.href = '/login'
    }
    return Promise.reject(error)
  },
)
