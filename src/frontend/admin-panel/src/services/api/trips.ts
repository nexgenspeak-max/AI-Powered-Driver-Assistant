import { apiClient } from './client'
import type { CreateTripPayload, Trip } from '../../types'

export const tripsService = {
  list: (status?: string) =>
    apiClient
      .get<Trip[]>('/api/v1/trips', { params: status ? { status } : undefined })
      .then(r => r.data),

  create: (payload: CreateTripPayload) =>
    apiClient.post<Trip>('/api/v1/trips', payload).then(r => r.data),

  dispatch: (trip_id: string, driver_phone: string) =>
    apiClient
      .post<Trip>(`/api/v1/trips/${trip_id}/dispatch`, { driver_phone })
      .then(r => r.data),
}
