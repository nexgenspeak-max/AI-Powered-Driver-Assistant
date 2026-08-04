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

  // Customer-initiated cancel — only valid while the trip hasn't progressed
  // past the driver accepting it (pending/notified/calling/confirmed); the
  // backend's ALLOWED_STATUSES/isTripOwner checks still enforce this and
  // ownership server-side regardless of what the UI gates on.
  cancel: (tripId: string) =>
    apiClient.patch<Trip>(`/trips/${tripId}`, { status: 'cancelled' }).then(r => r.data),

  // "Đặt lại chuyến" after a driver rejects — updates this same trip's
  // driver_phone and re-notifies, only valid while status is 'rejected'.
  reassignDriver: (tripId: string, driverPhone: string) =>
    apiClient.post<Trip>(`/trips/${tripId}/reassign-driver`, { driver_phone: driverPhone }).then(r => r.data),
}
