import axios from 'axios'
import { useAuthStore } from '../../stores/authStore'
import { refreshAccessToken } from './tokenRefresh'

export const authClient = axios.create({
  baseURL: import.meta.env.VITE_IDENTITY_SERVICE_URL ?? import.meta.env.VITE_AUTH_SERVICE_URL ?? 'http://localhost:8003/api/v1',
  headers: { 'Content-Type': 'application/json' },
})

authClient.interceptors.request.use(config => {
  const accessToken = useAuthStore.getState().accessToken
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`
  return config
})

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
      window.location.href = '/login'
    }

    return Promise.reject(err)
  },
)
