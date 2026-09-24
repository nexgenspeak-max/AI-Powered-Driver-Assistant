import axios from 'axios'
import { useAuthStore } from '../../stores/authStore'
import { authService } from './auth'

const tripServiceBaseURL =
  import.meta.env.VITE_EXTERNAL_API_SERVICE_URL ?? import.meta.env.VITE_TRIP_SERVICE_URL ?? 'http://localhost:8002'

const callLoggerBaseURL =
  import.meta.env.VITE_CALL_RECORDS_SERVICE_URL ?? import.meta.env.VITE_CALL_LOGGER_URL ?? 'http://localhost:8001'

export const apiClient = axios.create({
  baseURL: tripServiceBaseURL,
  headers: { 'Content-Type': 'application/json' },
})

export const callLoggerClient = axios.create({
  baseURL: callLoggerBaseURL,
  headers: { 'Content-Type': 'application/json' },
})

apiClient.interceptors.request.use(config => {
  const accessToken = useAuthStore.getState().accessToken
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`
  return config
})

callLoggerClient.interceptors.request.use(config => {
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
  response => response,
  async error => {
    const status = error.response?.status
    const original = error.config

    if (status === 401 && original && !original._retry && useAuthStore.getState().refreshToken) {
      original._retry = true
      refreshing ??= refreshAccessToken().finally(() => { refreshing = null })
      const newAccessToken = await refreshing

      if (newAccessToken) {
        original.headers.Authorization = `Bearer ${newAccessToken}`
        return apiClient.request(original)
      }
      window.location.href = '/login'
    }

    console.error('[trip-service]', error.config?.url, error.response?.status, error.message)
    return Promise.reject(error)
  },
)

callLoggerClient.interceptors.response.use(
  response => response,
  async error => {
    const status = error.response?.status
    const original = error.config

    if (status === 401 && original && !original._retry && useAuthStore.getState().refreshToken) {
      original._retry = true
      refreshing ??= refreshAccessToken().finally(() => { refreshing = null })
      const newAccessToken = await refreshing

      if (newAccessToken) {
        original.headers.Authorization = `Bearer ${newAccessToken}`
        return callLoggerClient.request(original)
      }
      window.location.href = '/login'
    }

    console.error('[call-records]', error.config?.url, error.response?.status, error.message)
    return Promise.reject(error)
  },
)
