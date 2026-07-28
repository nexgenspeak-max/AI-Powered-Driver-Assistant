import type { TripStatus, DeliveryOrderStatus } from '../types'

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

// Tamagui color-scale token pairs (light background step 4, readable text
// step 11) — @tamagui/config/v3 ships yellow/blue/purple/green/red/orange/
// pink/gray scales but no "teal", so arrived_pickup/picked_up moved to pink
// to stay visually distinct from notified's blue.
export const TRIP_STATUS_COLORS: Record<TripStatus, { bg: string; text: string }> = {
  pending: { bg: '$yellow4', text: '$yellow11' },
  notified: { bg: '$blue4', text: '$blue11' },
  calling: { bg: '$purple4', text: '$purple11' },
  confirmed: { bg: '$green4', text: '$green11' },
  rejected: { bg: '$red4', text: '$red11' },
  no_answer: { bg: '$orange4', text: '$orange11' },
  arrived_pickup: { bg: '$pink4', text: '$pink11' },
  picked_up: { bg: '$pink4', text: '$pink11' },
  completed: { bg: '$gray4', text: '$gray11' },
  cancelled: { bg: '$red4', text: '$red11' },
  cancelled_by_driver: { bg: '$red4', text: '$red11' },
  no_show: { bg: '$red4', text: '$red11' },
}

export const PENDING_STATUSES: TripStatus[] = ['notified', 'calling']

export const DELIVERY_ORDER_STATUS_LABELS: Record<DeliveryOrderStatus, string> = {
  pending: 'Chờ lấy hàng',
  picked_up: 'Đã lấy hàng',
  delivering: 'Đang giao hàng',
  delivered: 'Giao thành công',
  redelivery: 'Giao hàng lại',
  returned: 'Đã trả hàng',
}

export const DELIVERY_ORDER_STATUS_COLORS: Record<DeliveryOrderStatus, { bg: string; text: string }> = {
  pending: { bg: '$yellow4', text: '$yellow11' },
  picked_up: { bg: '$blue4', text: '$blue11' },
  delivering: { bg: '$purple4', text: '$purple11' },
  delivered: { bg: '$green4', text: '$green11' },
  redelivery: { bg: '$orange4', text: '$orange11' },
  returned: { bg: '$gray4', text: '$gray11' },
}
