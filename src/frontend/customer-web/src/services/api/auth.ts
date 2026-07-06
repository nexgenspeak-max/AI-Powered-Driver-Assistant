import { authClient } from './authClient'

export interface AuthUser {
  id: string
  role: 'admin' | 'driver' | 'customer'
  permissions: string[]
  name: string
  phone?: string
  email?: string
  status: 'online' | 'offline' | 'locked'
  vehicle_type?: string
  vehicle_plate?: string
  vehicle_name?: string
  created_at: string
  updated_at: string
}

export interface AuthTokens {
  access_token: string
  refresh_token: string
  user: AuthUser
}

export const authService = {
  login: (payload: { role: 'customer'; phone: string; password: string }) =>
    authClient.post<AuthTokens>('/auth/login', payload).then(r => r.data),

  register: (payload: { role: 'customer'; phone: string; name: string; email: string; password: string }) =>
    authClient.post<AuthTokens>('/auth/register', payload).then(r => r.data),

  refresh: (refresh_token: string) =>
    authClient.post<AuthTokens>('/auth/refresh', { refresh_token }).then(r => r.data),
}
