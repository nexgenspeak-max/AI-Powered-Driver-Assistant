import axios from 'axios'
import { router } from 'expo-router'
import { useAuthStore } from '../../stores/authStore'
import { queryClient } from '../../providers/QueryProvider'
import { refreshAccessToken } from './tokenRefresh'
import type { Driver } from '../../types'
import { attachHttpDevlog } from '../devlog'

export const apiClient = axios.create({
  baseURL: process.env.EXPO_PUBLIC_TRIP_SERVICE_URL ?? 'http://localhost:8002/api/v1',
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
      router.replace('/login')
    }

    console.error('[API]', err.config?.url, err.response?.status, err.message)
    return Promise.reject(err)
  },
)

attachHttpDevlog(apiClient)
