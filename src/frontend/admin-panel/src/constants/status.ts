import type { TripStatus } from '../types'

export const TRIP_STATUSES: TripStatus[] = [
  'pending', 'notified', 'calling', 'confirmed', 'rejected', 'no_answer', 'completed',
]

export const TRIP_STATUS_COLORS: Record<TripStatus, 'default' | 'warning' | 'info' | 'success' | 'error' | 'primary'> = {
  pending:   'warning',
  notified:  'info',
  calling:   'primary',
  confirmed: 'success',
  rejected:  'error',
  no_answer: 'warning',
  completed: 'default',
}

export const TRIP_STATUS_LABELS: Record<TripStatus, string> = {
  pending:   'Pending',
  notified:  'Notified',
  calling:   'Calling',
  confirmed: 'Confirmed',
  rejected:  'Rejected',
  no_answer: 'No Answer',
  completed: 'Completed',
}

export const DISPATCHABLE_STATUSES: TripStatus[] = ['pending', 'no_answer', 'rejected']
