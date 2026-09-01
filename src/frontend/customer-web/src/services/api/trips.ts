import { apiClient } from './client'
import type { Trip, CreateTripPayload } from '../../types'

export const tripsService = {
  create: (payload: CreateTripPayload) =>
    apiClient.post<Trip>('/trips', payload).then(r => r.data),

  get: (tripId: string) =>
    apiClient.get<Trip>(`/trips/${tripId}`).then(r => r.data),

  history: (limit = 50) =>
    apiClient.get<Trip[]>('/trips', { params: { limit } }).then(r => r.data),

  cancel: (tripId: string) =>
    apiClient.patch<Trip>(`/trips/${tripId}`, { status: 'cancelled' }).then(r => r.data),

  reassignDriver: (tripId: string, driverPhone: string) =>
    apiClient.post<Trip>(`/trips/${tripId}/reassign-driver`, { driver_phone: driverPhone }).then(r => r.data),
}
