import { apiClient } from './client'
import type { Trip } from '../../types'

export const tripsService = {
  listByDriver: (phone: string, status?: string) =>
    apiClient.get<Trip[]>('/trips', { params: { driver_phone: phone, status } }).then(r => r.data),

  accept: (tripId: string) =>
    apiClient.patch<Trip>(`/trips/${tripId}`, { status: 'confirmed' }).then(r => r.data),

  reject: (tripId: string) =>
    apiClient.patch<Trip>(`/trips/${tripId}`, { status: 'rejected' }).then(r => r.data),

  complete: (tripId: string) =>
    apiClient.patch<Trip>(`/trips/${tripId}`, { status: 'completed' }).then(r => r.data),
}
