import { apiClient } from './client'
import type { Trip, CreateTripPayload } from '../../types'

export const tripsService = {
  create: (payload: CreateTripPayload) =>
    apiClient.post<Trip>('/trips', payload).then(r => r.data),

  get: (tripId: string) =>
    apiClient.get<Trip>(`/trips/${tripId}`).then(r => r.data),
}
