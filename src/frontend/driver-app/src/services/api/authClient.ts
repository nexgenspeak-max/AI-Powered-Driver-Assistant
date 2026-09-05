import axios from 'axios'
import { useAuthStore } from '../../stores/authStore'
import { refreshAccessToken } from './tokenRefresh'
import { logoutAndReset } from '../../features/auth/logoutAndReset'
import { attachHttpDevlog } from '../devlog'

export const authClient = axios.create({
  baseURL: process.env.EXPO_PUBLIC_AUTH_SERVICE_URL ?? 'http://localhost:8003/api/v1',
  headers: { 'Content-Type': 'application/json' },
})

authClient.interceptors.request.use(config => {
  const accessToken = useAuthStore.getState().accessToken
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`
  return config
})

// Without this, an expired access token made every authClient call fail with
// a silent 401 — apiClient already retries-after-refresh for trip-service
// calls, but authClient previously had no equivalent.
authClient.interceptors.response.use(
  r => r,
  async err => {
    const status = err.response?.status
    const original = err.config

    if (status === 401 && original && !original._retry && useAuthStore.getState().refreshToken) {
      original._retry = true
      const newAccessToken = await refreshAccessToken()

      if (newAccessToken) {
        original.headers.Authorization = `Bearer ${newAccessToken}`
        return authClient.request(original)
      }
      logoutAndReset()
    }

    console.error('[authClient]', err.config?.url, err.response?.status, err.message)
    return Promise.reject(err)
  },
)

attachHttpDevlog(authClient)
