import axios from 'axios'
import { useAuthStore } from '../../stores/authStore'
import { refreshAccessToken } from './tokenRefresh'

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_EXTERNAL_API_SERVICE_URL ?? import.meta.env.VITE_TRIP_SERVICE_URL ?? 'http://localhost:8002/api/v1',
  headers: { 'Content-Type': 'application/json' },
})

apiClient.interceptors.request.use(config => {
  const accessToken = useAuthStore.getState().accessToken
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`
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
