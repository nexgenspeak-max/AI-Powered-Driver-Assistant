import axios from 'axios'
import { router } from 'expo-router'
import { useAuthStore } from '../../stores/authStore'
import { authService } from './auth'

export const apiClient = axios.create({
  baseURL: process.env.EXPO_PUBLIC_TRIP_SERVICE_URL ?? 'http://localhost:8002/api/v1',
  headers: { 'Content-Type': 'application/json' },
})

apiClient.interceptors.request.use(config => {
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

apiClient.interceptors.response.use(
  r => r,
  async err => {
    const status = err.response?.status
    const original = err.config

    if (status === 401 && original && !original._retry && useAuthStore.getState().refreshToken) {
      original._retry = true
      refreshing ??= refreshAccessToken().finally(() => { refreshing = null })
      const newAccessToken = await refreshing

      if (newAccessToken) {
        original.headers.Authorization = `Bearer ${newAccessToken}`
        return apiClient.request(original)
      }
      router.replace('/login')
    }

    console.error('[API]', err.config?.url, err.response?.status, err.message)
    return Promise.reject(err)
  },
)
