import type { TripStatus } from '../types'

export const TRIP_STATUS_LABELS: Record<TripStatus, string> = {
  pending: 'Chờ xử lý',
  notified: 'Đã thông báo',
  calling: 'Đang gọi',
  confirmed: 'Đã xác nhận',
  rejected: 'Từ chối',
  no_answer: 'Không nghe máy',
  arrived_pickup: 'Đã đến điểm đón',
  picked_up: 'Đang chở khách',
  completed: 'Hoàn thành',
  cancelled: 'Đã hủy',
  cancelled_by_driver: 'Tài xế hủy',
  no_show: 'Khách không đến',
}

export const TRIP_STATUS_COLORS: Record<TripStatus, { bg: string; text: string }> = {
  pending: { bg: '#FEF9C3', text: '#854D0E' },
  notified: { bg: '#DBEAFE', text: '#1E40AF' },
  calling: { bg: '#EDE9FE', text: '#5B21B6' },
  confirmed: { bg: '#DCFCE7', text: '#166534' },
  rejected: { bg: '#FEE2E2', text: '#991B1B' },
  no_answer: { bg: '#FFEDD5', text: '#9A3412' },
  arrived_pickup: { bg: '#FCE7F3', text: '#9D174D' },
  picked_up: { bg: '#FCE7F3', text: '#9D174D' },
  completed: { bg: '#F3F4F6', text: '#374151' },
  cancelled: { bg: '#FEE2E2', text: '#991B1B' },
  cancelled_by_driver: { bg: '#FEE2E2', text: '#991B1B' },
  no_show: { bg: '#FEE2E2', text: '#991B1B' },
}

export const PENDING_STATUSES: TripStatus[] = ['pending', 'notified', 'calling']
export const IN_PROGRESS_STATUSES: TripStatus[] = ['confirmed', 'arrived_pickup', 'picked_up']
