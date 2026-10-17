import type { TripStatus } from '../types'

// Driver-facing status labels — Vietnamese, phrased from the driver's point
// of view ("Đang gọi bạn", "Bạn đã huỷ"), not the backend enum names.
export const TRIP_STATUS_LABELS: Record<TripStatus, string> = {
  pending: 'Chờ gán tài xế',
  notified: 'Chuyến mới',
  calling: 'Đang gọi bạn',
  confirmed: 'Đã nhận',
  rejected: 'Đã từ chối',
  no_answer: 'Không trả lời',
  arrived_pickup: 'Đã đến điểm đón',
  picked_up: 'Đang chở khách',
  completed: 'Hoàn thành',
  cancelled: 'Khách đã huỷ',
  cancelled_by_driver: 'Bạn đã huỷ',
  no_show: 'Khách vắng mặt',
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

export const PENDING_STATUSES: TripStatus[] = ['pending', 'notified', 'calling']
