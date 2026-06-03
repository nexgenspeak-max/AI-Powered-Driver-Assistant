import type { TripStatus } from '../types'

export const TRIP_STATUS_LABELS: Record<TripStatus, string> = {
  pending:   'Pending',
  notified:  'Notified',
  calling:   'Calling',
  confirmed: 'Confirmed',
  rejected:  'Rejected',
  no_answer: 'No Answer',
  completed: 'Completed',
}

export const TRIP_STATUS_COLORS: Record<TripStatus, string> = {
  pending:   'bg-yellow-100 text-yellow-800',
  notified:  'bg-blue-100 text-blue-800',
  calling:   'bg-purple-100 text-purple-800',
  confirmed: 'bg-green-100 text-green-800',
  rejected:  'bg-red-100 text-red-800',
  no_answer: 'bg-orange-100 text-orange-800',
  completed: 'bg-gray-100 text-gray-700',
}

export const DISPATCHABLE_STATUSES: TripStatus[] = ['pending', 'no_answer', 'rejected']
