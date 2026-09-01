import { apiClient } from './client'
import type { DeliveryOrder, DeliveryOrderStatus } from '../../types'

export interface CreateDeliveryOrderInput {
  sender_phone: string
  sender_address?: string
  recipient_phone: string
  recipient_address: string
  recipient_name?: string
  note?: string
}

export const deliveryOrdersService = {
  list: () => apiClient.get<DeliveryOrder[]>('/delivery-orders').then(r => r.data),

  create: (input: CreateDeliveryOrderInput) =>
    apiClient.post<DeliveryOrder>('/delivery-orders', input).then(r => r.data),

  updateStatus: (orderId: string, status: DeliveryOrderStatus) =>
    apiClient.patch<DeliveryOrder>(`/delivery-orders/${orderId}`, { status }).then(r => r.data),
}
