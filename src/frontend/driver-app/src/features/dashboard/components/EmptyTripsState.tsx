import { EmptyState } from '../../../components/EmptyState'

export function EmptyTripsState({ isOnline }: { isOnline: boolean }) {
  return (
    <EmptyState
      icon={isOnline ? 'checkmark-circle-outline' : 'power-outline'}
      title={isOnline ? 'Chưa có chuyến nào' : 'Bạn đang offline'}
      message={
        isOnline
          ? 'Đang chờ chuyến mới được giao...'
          : 'Bật "Đang bật" để bắt đầu nhận chuyến'
      }
    />
  )
}
