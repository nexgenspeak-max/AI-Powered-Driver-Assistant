import axios from 'axios'
import { useAuthStore } from '../../stores/authStore'
import { queryClient } from '../../providers/QueryProvider'
import { refreshAccessToken } from './tokenRefresh'
import { logoutAndReset } from '../../features/auth/logoutAndReset'
import type { Driver } from '../../types'
import { attachHttpDevlog } from '../devlog'

export const apiClient = axios.create({
  baseURL: process.env.EXPO_PUBLIC_EXTERNAL_API_SERVICE_URL ?? process.env.EXPO_PUBLIC_TRIP_SERVICE_URL ?? 'http://localhost:8002/api/v1',
  headers: { 'Content-Type': 'application/json' },
})

apiClient.interceptors.request.use(config => {
  const { accessToken } = useAuthStore.getState()
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`
  // Driver profile isn't persisted (see authStore.ts) — it only lives in
  // the React Query ['me'] cache useCurrentUser() populates, so this plain
  // axios interceptor (outside the component tree) reads it from there
  // instead of a store.
  const driver = queryClient.getQueryData<Driver>(['me'])
  if (driver?.phone) config.headers['X-Driver-Phone'] = driver.phone
  return config
})

apiClient.interceptors.response.use(
  r => r,
  async err => {
    const status = err.response?.status
    const original = err.config

    if (status === 401 && original && !original._retry && useAuthStore.getState().refreshToken) {
      original._retry = true
      const newAccessToken = await refreshAccessToken()

      if (newAccessToken) {
        original.headers.Authorization = `Bearer ${newAccessToken}`
        return apiClient.request(original)
      }
      logoutAndReset()
    }

    // 4xx answers the UI already explains (409 "chưa đến nơi", 400 validation,
    // 404) are expected outcomes, not crashes — console.error opened the
    // full-screen dev LogBox over the app for every geofence refusal.
    const expected = typeof status === 'number' && status >= 400 && status < 500 && status !== 401
    ;(expected ? console.warn : console.error)('[API]', err.config?.url, status, err.message)
    return Promise.reject(err)
  },
)

attachHttpDevlog(apiClient)
