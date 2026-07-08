import type { TripStatus } from '../types'

export const TRIP_STATUSES: TripStatus[] = [
  'pending', 'notified', 'calling', 'confirmed', 'rejected', 'no_answer', 'completed',
  'cancelled', 'cancelled_by_driver', 'no_show', 'arrived_pickup', 'picked_up',
]

export const TRIP_STATUS_COLORS: Record<TripStatus, 'default' | 'warning' | 'info' | 'success' | 'error' | 'primary'> = {
  pending:             'warning',
  notified:            'info',
  calling:             'primary',
  confirmed:           'success',
  rejected:            'error',
  no_answer:           'warning',
  completed:           'default',
  cancelled:           'error',
  cancelled_by_driver: 'error',
  no_show:             'error',
  arrived_pickup:      'info',
  picked_up:           'primary',
}

export const TRIP_STATUS_LABELS: Record<TripStatus, string> = {
  pending:             'Pending',
  notified:            'Notified',
  calling:             'Calling',
  confirmed:           'Confirmed',
  rejected:            'Rejected',
  no_answer:           'No Answer',
  completed:           'Completed',
  cancelled:           'Cancelled',
  cancelled_by_driver: 'Cancelled by Driver',
  no_show:             'No Show',
  arrived_pickup:      'Arrived Pickup',
  picked_up:           'Picked Up',
}

export const DISPATCHABLE_STATUSES: TripStatus[] = ['pending', 'no_answer', 'rejected']

// trip-service normalizes every incoming status to lowercase before storing it
// (PATCH /api/v1/trips/:tripId lowercases req.body.status), but older rows written
// before that change may still hold mixed-case values — normalize defensively
// before using a trip's raw status as a lookup key or filter value.
export function normalizeTripStatus(status: string): TripStatus {
  return (status.toLowerCase() as TripStatus)
}
