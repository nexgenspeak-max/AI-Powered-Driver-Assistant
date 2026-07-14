import type { TripStatus } from '../types'

export const TRIP_STATUS_LABELS: Record<TripStatus, string> = {
  pending: 'Pending',
  notified: 'Notified',
  calling: 'Calling',
  confirmed: 'Confirmed',
  rejected: 'Rejected',
  no_answer: 'No Answer',
  arrived_pickup: 'Arrived at Pickup',
  picked_up: 'Customer Picked Up',
  completed: 'Completed',
  cancelled: 'Cancelled',
  cancelled_by_driver: 'Cancelled by You',
  no_show: 'No Show',
}

export const TRIP_STATUS_COLORS: Record<TripStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  notified: 'bg-blue-100 text-blue-800',
  calling: 'bg-purple-100 text-purple-800',
  confirmed: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  no_answer: 'bg-orange-100 text-orange-800',
  arrived_pickup: 'bg-teal-100 text-teal-800',
  picked_up: 'bg-teal-100 text-teal-800',
  completed: 'bg-gray-100 text-gray-700',
  cancelled: 'bg-red-100 text-red-800',
  cancelled_by_driver: 'bg-red-100 text-red-800',
  no_show: 'bg-red-100 text-red-800',
}

export const PENDING_STATUSES: TripStatus[] = ['notified', 'calling']
export const ACTIVE_STATUSES: TripStatus[] = ['confirmed', 'arrived_pickup', 'picked_up']
