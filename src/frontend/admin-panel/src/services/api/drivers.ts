import { apiClient } from './client'
import type { Driver } from '../../types'

export type DriverLocation = {
  phone: string
  name: string
  status: 'online' | 'offline' | 'locked'
  lat: number
  lng: number
  updated_at: string | null
}

export const driversService = {
  list: () =>
    apiClient.get<Driver[]>('/api/v1/drivers').then(r => r.data),

  /** Drivers with a fresh live GPS fix (dispatcher live map). */
  locations: () =>
    apiClient.get<DriverLocation[]>('/api/v1/drivers/locations').then(r => r.data),

//   listOnline: () =>
//     apiClient.get<Driver[]>('/api/v1/drivers/online').then(r => r.data),

//   get: (phone: string) =>
//     apiClient.get<Driver>(`/api/v1/drivers/${phone}`).then(r => r.data),

//   register: (payload: { phone: string; name: string; fcm_token?: string }) =>
//     apiClient.post<Driver>('/api/v1/drivers', payload).then(r => r.data),

//   update: (phone: string, payload: Partial<Driver>) =>
//     apiClient.patch<Driver>(`/api/v1/drivers/${phone}`, payload).then(r => r.data),
}
