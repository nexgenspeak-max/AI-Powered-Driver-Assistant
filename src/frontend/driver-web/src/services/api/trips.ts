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

  complete: (tripId: string, lat: number, lng: number) =>
    apiClient.patch<Trip>(`/trips/${tripId}`, { status: 'completed', lat, lng }).then(r => r.data),

  arrivedPickup: (tripId: string, lat: number, lng: number) =>
    apiClient.patch<Trip>(`/trips/${tripId}`, { status: 'arrived_pickup', lat, lng }).then(r => r.data),

  pickedUp: (tripId: string, lat: number, lng: number) =>
    apiClient.patch<Trip>(`/trips/${tripId}`, { status: 'picked_up', lat, lng }).then(r => r.data),

  cancel: (tripId: string) =>
    apiClient.patch<Trip>(`/trips/${tripId}`, { status: 'cancelled_by_driver' }).then(r => r.data),

  updateLocation: (tripId: string, lat: number, lng: number) =>
    apiClient.post(`/trips/${tripId}/location`, { lat, lng }).then(r => r.data),
}
