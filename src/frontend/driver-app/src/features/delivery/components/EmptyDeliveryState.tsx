import { EmptyState } from '../../../components/EmptyState'

export function EmptyDeliveryState() {
  return (
    <EmptyState
      icon="cube-outline"
      title="Chưa có đơn giao hàng"
      message='Nhấn "Thêm đơn hàng" để tạo đơn giao hàng mới'
    />
  )
}
