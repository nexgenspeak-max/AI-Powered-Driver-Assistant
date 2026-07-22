import { apiClient } from './client'
import type { Trip, TripStatus } from '../../types'

export const tripsService = {
  listByDriver: (phone: string, status?: TripStatus) =>
    apiClient.get<Trip[]>('/trips', { params: { driver_phone: phone, status } }).then(r => r.data),

  accept: (tripId: string) =>
    apiClient.patch<Trip>(`/trips/${tripId}`, { status: 'confirmed' }).then(r => r.data),

  reject: (tripId: string) =>
    apiClient.patch<Trip>(`/trips/${tripId}`, { status: 'rejected' }).then(r => r.data),

  complete: (tripId: string) =>
    apiClient.patch<Trip>(`/trips/${tripId}`, { status: 'completed' }).then(r => r.data),

  arrivedPickup: (tripId: string) =>
    apiClient.patch<Trip>(`/trips/${tripId}`, { status: 'arrived_pickup' }).then(r => r.data),

  pickedUp: (tripId: string) =>
    apiClient.patch<Trip>(`/trips/${tripId}`, { status: 'picked_up' }).then(r => r.data),

  // Distinct from `reject` (a pending request the driver never accepted) —
  // this is the driver backing out of a trip they already confirmed
  // (confirmed/arrived_pickup/picked_up), so it's tracked as its own status
  // rather than reusing `cancelled` (the customer-initiated equivalent) —
  // see backend trips.ts's ALLOWED_STATUSES/CANCELLED_STATUSES.
  cancel: (tripId: string) =>
    apiClient.patch<Trip>(`/trips/${tripId}`, { status: 'cancelled_by_driver' }).then(r => r.data),
}
