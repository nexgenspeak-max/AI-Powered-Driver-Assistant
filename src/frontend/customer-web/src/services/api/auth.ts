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

// login/refresh are token-only — the customer's profile is fetched
// separately via me() instead. register is the one exception: the caller
// has no other way to get the just-created profile without an extra round
// trip.
export interface AuthTokens {
  access_token: string
  refresh_token: string
}

export interface AuthRegisterResponse extends AuthTokens {
  user: AuthUser
}

export const authService = {
  login: (payload: { role: 'customer'; phone: string; password: string }) =>
    authClient.post<AuthTokens>('/auth/login', payload).then(r => r.data),

  register: (payload: { role: 'customer'; phone: string; name: string; email: string; password: string }) =>
    authClient.post<AuthRegisterResponse>('/auth/register', payload).then(r => r.data),

  refresh: (refresh_token: string) =>
    authClient.post<AuthTokens>('/auth/refresh', { refresh_token }).then(r => r.data),

  me: () => authClient.get<AuthUser>('/auth/me').then(r => r.data),

  setStatus: (id: string, status: 'online' | 'offline') =>
    authClient.patch(`/accounts/${id}`, { status }).then(r => r.data),

  updateProfile: (id: string, payload: { name: string }) =>
    authClient.patch<AuthUser>(`/accounts/${id}`, payload).then(r => r.data),
}
