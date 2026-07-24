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

// login/refresh are token-only now — the driver's profile is never sent (or
// stored) on those calls, only fetched on demand via me(). register is the
// one exception: the client has no other way to get the just-created
// profile without an extra round trip.
export interface AuthTokens {
  access_token: string
  refresh_token: string
}

export interface AuthRegisterResponse extends AuthTokens {
  user: AuthUser
}

export const authService = {
  login: (payload: { role: 'driver'; phone: string; password: string }) =>
    authClient.post<AuthTokens>('/auth/login', payload).then(r => r.data),

  register: (payload: {
    role: 'driver'
    phone: string
    name: string
    email: string
    password: string
    vehicle_type: string
    vehicle_plate: string
    vehicle_name: string
  }, signal?: AbortSignal) => authClient.post<AuthRegisterResponse>('/auth/register', payload, { signal }).then(r => r.data),

  refresh: (refresh_token: string) =>
    authClient.post<AuthTokens>('/auth/refresh', { refresh_token }).then(r => r.data),

  me: () => authClient.get<AuthUser>('/auth/me').then(r => r.data),

  // Only these fields are actually persisted — accounts.ts's EDITABLE_FIELDS
  // covers exactly `name`, `vehicle_type`, `vehicle_plate`, `vehicle_name`
  // (plus fcm_token) — phone/email stay read-only in the app.
  updateProfile: (id: string, payload: { name: string }) =>
    authClient.patch<AuthUser>(`/accounts/${id}`, payload).then(r => r.data),

  updateVehicle: (id: string, payload: { vehicle_type: string; vehicle_plate: string; vehicle_name: string }) =>
    authClient.patch<AuthUser>(`/accounts/${id}`, payload).then(r => r.data),
}
