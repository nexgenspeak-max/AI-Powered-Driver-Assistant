import axios from 'axios'

const tripServiceBaseURL =
  import.meta.env.VITE_TRIP_SERVICE_URL ?? 'http://localhost:8002'

const callLoggerBaseURL =
  import.meta.env.VITE_CALL_LOGGER_URL ?? 'http://localhost:8001'

export const apiClient = axios.create({
  baseURL: tripServiceBaseURL,
  headers: { 'Content-Type': 'application/json' },
})

export const callLoggerClient = axios.create({
  baseURL: callLoggerBaseURL,
  headers: { 'Content-Type': 'application/json' },
})

apiClient.interceptors.response.use(
  response => response,
  error => {
    console.error('[trip-service]', error.config?.url, error.response?.status, error.message)
    return Promise.reject(error)
  },
)

callLoggerClient.interceptors.response.use(
  response => response,
  error => {
    console.error('[call-logger]', error.config?.url, error.response?.status, error.message)
    return Promise.reject(error)
  },
)
