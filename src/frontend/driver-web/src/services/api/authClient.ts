import axios from 'axios'

export const authClient = axios.create({
  baseURL: import.meta.env.VITE_AUTH_SERVICE_URL ?? 'http://localhost:8003/api/v1',
  headers: { 'Content-Type': 'application/json' },
})
