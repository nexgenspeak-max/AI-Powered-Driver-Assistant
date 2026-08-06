import { apiClient } from './client'
import type { Trip, TripStatus } from '../../types'

export const tripsService = {
  get: (tripId: string) =>
    apiClient.get<Trip>(`/trips/${tripId}`).then(r => r.data),

  listByDriver: (phone: string, status?: TripStatus) =>
    apiClient.get<Trip[]>('/trips', { params: { driver_phone: phone, status } }).then(r => r.data),

  accept: (tripId: string) =>
    apiClient.patch<Trip>(`/trips/${tripId}`, { status: 'confirmed' }).then(r => r.data),

  reject: (tripId: string) =>
    apiClient.patch<Trip>(`/trips/${tripId}`, { status: 'rejected' }).then(r => r.data),

  // lat/lng are the driver's current GPS fix — the backend rejects
  // arrived_pickup/picked_up/completed (409) when they're too far from the
  // trip's pickup/dropoff point, so these three all require a fresh fix
  // before calling (see ActiveTripCard.tsx).
  complete: (tripId: string, lat: number, lng: number) =>
    apiClient.patch<Trip>(`/trips/${tripId}`, { status: 'completed', lat, lng }).then(r => r.data),

  arrivedPickup: (tripId: string, lat: number, lng: number) =>
    apiClient.patch<Trip>(`/trips/${tripId}`, { status: 'arrived_pickup', lat, lng }).then(r => r.data),

  pickedUp: (tripId: string, lat: number, lng: number) =>
    apiClient.patch<Trip>(`/trips/${tripId}`, { status: 'picked_up', lat, lng }).then(r => r.data),

  // Distinct from `reject` (a pending request the driver never accepted) —
  // this is the driver backing out of a trip they already confirmed
  // (confirmed/arrived_pickup/picked_up), so it's tracked as its own status
  // rather than reusing `cancelled` (the customer-initiated equivalent) —
  // see backend trips.ts's ALLOWED_STATUSES/CANCELLED_STATUSES.
  cancel: (tripId: string) =>
    apiClient.patch<Trip>(`/trips/${tripId}`, { status: 'cancelled_by_driver' }).then(r => r.data),

  // Fire-and-forget GPS ping from locationTracking.ts — errors are handled
  // by the caller (network hiccups shouldn't kill the tracking loop).
  updateLocation: (tripId: string, lat: number, lng: number) =>
    apiClient.post(`/trips/${tripId}/location`, { lat, lng }).then(r => r.data),
}
