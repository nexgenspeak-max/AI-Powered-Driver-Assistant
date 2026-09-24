import axios from 'axios'
import { useAuthStore } from '../../stores/authStore'

export const authClient = axios.create({
  baseURL: import.meta.env.VITE_IDENTITY_SERVICE_URL ?? import.meta.env.VITE_AUTH_SERVICE_URL ?? 'http://localhost:8003/api/v1',
  headers: { 'Content-Type': 'application/json' },
})

authClient.interceptors.request.use(config => {
  const accessToken = useAuthStore.getState().accessToken
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`
  return config
})
