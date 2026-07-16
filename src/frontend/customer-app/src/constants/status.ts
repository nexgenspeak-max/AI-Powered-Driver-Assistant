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

// Tamagui color-scale token pairs (light background step 4, readable text
// step 11) — @tamagui/config/v3 ships yellow/blue/purple/green/red/orange/
// gray scales, matching the previous Tailwind color choices 1:1.
export const TRIP_STATUS_COLORS: Record<TripStatus, { bg: string; text: string }> = {
  pending:   { bg: '$yellow4', text: '$yellow11' },
  notified:  { bg: '$blue4', text: '$blue11' },
  calling:   { bg: '$purple4', text: '$purple11' },
  confirmed: { bg: '$green4', text: '$green11' },
  rejected:  { bg: '$red4', text: '$red11' },
  no_answer: { bg: '$orange4', text: '$orange11' },
  completed: { bg: '$gray4', text: '$gray11' },
}

export const DISPATCHABLE_STATUSES: TripStatus[] = ['pending', 'no_answer', 'rejected']
