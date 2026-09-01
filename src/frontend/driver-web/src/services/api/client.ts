import axios from 'axios'
import { useAuthStore } from '../../stores/authStore'
import { queryClient } from '../../providers/queryClient'
import { refreshAccessToken } from './tokenRefresh'
import type { Driver } from '../../types'

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_TRIP_SERVICE_URL ?? 'http://localhost:8002/api/v1',
  headers: { 'Content-Type': 'application/json' },
})

apiClient.interceptors.request.use(config => {
  const accessToken = useAuthStore.getState().accessToken
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`
  const driver =
    queryClient.getQueryData<Driver>(['me']) ??
    useAuthStore.getState().driver
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
      window.location.href = '/login'
    }

    console.error('[API]', err.config?.url, err.response?.status, err.message)
    return Promise.reject(err)
  },
)
