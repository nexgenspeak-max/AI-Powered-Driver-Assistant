import { apiClient } from './client'
import type { Trip, CreateTripPayload } from '../../types'

export const tripsService = {
  create: (payload: CreateTripPayload) =>
    apiClient.post<Trip>('/trips', payload).then(r => r.data),

  get: (tripId: string) =>
    apiClient.get<Trip>(`/trips/${tripId}`).then(r => r.data),

  // The backend resolves the account from the caller's own JWT — no need to pass
  // an identifier, and a customer can never fetch another account's history.
  history: (limit = 50) =>
    apiClient.get<Trip[]>('/trips', { params: { limit } }).then(r => r.data),
}
