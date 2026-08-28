import type { ImageSourcePropType } from 'react-native'
import type { TripStatus } from '../types'

export const TRIP_STATUS_LABELS: Record<TripStatus, string> = {
  pending:             'Pending',
  notified:            'Notified',
  calling:             'Calling',
  confirmed:           'Confirmed',
  rejected:            'Rejected',
  no_answer:           'No Answer',
  arrived_pickup:      'Driver Arrived',
  picked_up:           'On Trip',
  completed:           'Completed',
  cancelled:           'Cancelled',
  cancelled_by_driver: 'Cancelled by Driver',
  no_show:             'No Show',
}

// Tamagui color-scale token pairs (light background step 4, readable text
// step 11) — @tamagui/config/v3 ships yellow/blue/purple/green/red/orange/
// pink/gray scales but no "teal", so arrived_pickup/picked_up moved to pink
// to stay visually distinct from notified's blue — same convention as
// driver-app's constants/status.ts (kept in sync across both apps).
export const TRIP_STATUS_COLORS: Record<TripStatus, { bg: string; text: string }> = {
  pending:             { bg: '$yellow4', text: '$yellow11' },
  notified:            { bg: '$blue4', text: '$blue11' },
  calling:             { bg: '$purple4', text: '$purple11' },
  confirmed:           { bg: '$green4', text: '$green11' },
  rejected:            { bg: '$red4', text: '$red11' },
  no_answer:           { bg: '$orange4', text: '$orange11' },
  arrived_pickup:      { bg: '$pink4', text: '$pink11' },
  picked_up:           { bg: '$pink4', text: '$pink11' },
  completed:           { bg: '$gray4', text: '$gray11' },
  cancelled:           { bg: '$red4', text: '$red11' },
  cancelled_by_driver: { bg: '$red4', text: '$red11' },
  no_show:             { bg: '$red4', text: '$red11' },
}

export const DISPATCHABLE_STATUSES: TripStatus[] = ['pending', 'no_answer', 'rejected']

// Trip history tabs (TripHistoryList.tsx) — mirrors driver-app's own
// PENDING_STATUSES/IN_PROGRESS split in its constants/status.ts, kept in
// sync across both apps. "Đã hoàn thành" is deliberately `completed` only —
// cancelled/rejected/no_answer/no_show trips don't appear in any of the 3
// tabs (same choice made on the driver side).
export const PENDING_STATUSES: TripStatus[] = ['pending', 'notified', 'calling']
export const IN_PROGRESS_STATUSES: TripStatus[] = ['confirmed', 'arrived_pickup', 'picked_up']

// Light mode: flat, full-color status icons (assets/icons/light/) for the
// trips list — replaces the plain Ionicons "car" glyph GlassTripCard used
// for every status alike. Covered so far: confirmed/picked_up read as "trip
// actively moving", arrived_pickup as the driver waiting, completed as done,
// calling reuses the same phone-call icon as ProfileCard's phone row (the
// system is literally calling the driver here), rejected is a taxi with a
// red X badge.
//
// Still on the fallback car glyph, by design, not oversight: pending/
// notified (nothing to show yet — driver not even being contacted/reached
// out to), and the remaining failure states no_answer/cancelled/
// cancelled_by_driver/no_show — none of the current icon set has anything
// specific to "missed"/"cancelled" distinct from "rejected", so forcing
// rejected's icon onto them would blur a real distinction the color-coded
// badge still makes. Add a dedicated icon per state before mapping them here.
export const TRIP_STATUS_ICON: Partial<Record<TripStatus, ImageSourcePropType>> = {
  calling: require('../../assets/icons/light/phone-call.png'),
  confirmed: require('../../assets/icons/light/trip-in-progress.png'),
  picked_up: require('../../assets/icons/light/trip-in-progress.png'),
  arrived_pickup: require('../../assets/icons/light/trip-driver-arrived.png'),
  completed: require('../../assets/icons/light/trip-completed.png'),
  rejected: require('../../assets/icons/light/trip-rejected.png'),
}

// Dark mode: single-color silhouette counterparts (assets/icons/dark/),
// tinted white at the render site (GlassTripCard) — same key set as above.
export const TRIP_STATUS_ICON_DARK: Partial<Record<TripStatus, ImageSourcePropType>> = {
  calling: require('../../assets/icons/dark/phone-call.png'),
  confirmed: require('../../assets/icons/dark/trip-in-progress.png'),
  picked_up: require('../../assets/icons/dark/trip-in-progress.png'),
  arrived_pickup: require('../../assets/icons/dark/trip-driver-arrived.png'),
  completed: require('../../assets/icons/dark/trip-completed.png'),
  rejected: require('../../assets/icons/dark/trip-rejected.png'),
}
