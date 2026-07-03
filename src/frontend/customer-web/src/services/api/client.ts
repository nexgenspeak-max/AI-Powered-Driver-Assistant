import axios from 'axios'

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_TRIP_SERVICE_URL ?? 'http://localhost:8002/api/v1',
  headers: { 'Content-Type': 'application/json' },
})

apiClient.interceptors.response.use(
  r => r,
  err => {
    console.error('[API]', err.config?.url, err.response?.status, err.message)
    return Promise.reject(err)
  },
)
