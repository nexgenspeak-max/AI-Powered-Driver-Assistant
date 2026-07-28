import { XStack, YStack, View, Text } from 'tamagui'
import { Ionicons } from '@expo/vector-icons'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { GlassSurface } from '../../../components/GlassSurface'
import { Badge } from '../../../components/Badge'
import { Button } from '../../../components/Button'
import { InfoRow } from '../../dashboard/components/InfoRow'
import { formatDate } from '../../../utils/format'
import { deliveryOrdersService } from '../../../services/api/deliveryOrders'
import { DELIVERY_ORDER_STATUS_LABELS, DELIVERY_ORDER_STATUS_COLORS } from '../../../constants/status'
import type { DeliveryOrder, DeliveryOrderStatus } from '../../../types'

// Primary forward action per status — mirrors ActiveTripCard.tsx's
// NEXT_ACTION map. `delivering`/`redelivery` also get a secondary text-link
// for the non-happy-path branch (failed delivery / give up and return).
const NEXT_ACTION: Partial<Record<DeliveryOrderStatus, { label: string; target: DeliveryOrderStatus }>> = {
  pending: { label: 'Đã lấy hàng', target: 'picked_up' },
  picked_up: { label: 'Bắt đầu giao hàng', target: 'delivering' },
  delivering: { label: 'Giao thành công', target: 'delivered' },
  redelivery: { label: 'Giao lại', target: 'delivering' },
}
const SECONDARY_ACTION: Partial<Record<DeliveryOrderStatus, { label: string; target: DeliveryOrderStatus }>> = {
  delivering: { label: 'Không giao được, giao lại', target: 'redelivery' },
  redelivery: { label: 'Trả hàng', target: 'returned' },
}

export function DeliveryOrderCard({ order }: { order: DeliveryOrder }) {
  const qc = useQueryClient()
  const { mutate: setStatus, isPending } = useMutation({
    mutationFn: (status: DeliveryOrderStatus) => deliveryOrdersService.updateStatus(order.order_id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['deliveryOrders'] }),
  })

  const primary = NEXT_ACTION[order.status]
  const secondary = SECONDARY_ACTION[order.status]
  const statusColor = DELIVERY_ORDER_STATUS_COLORS[order.status]

  return (
    <GlassSurface style={{ width: '100%' }}>
      <YStack padding="$4" gap="$3">
        <XStack alignItems="center" gap="$3">
          <View
            width={48}
            height={48}
            borderRadius={24}
            backgroundColor="$primaryMuted"
            alignItems="center"
            justifyContent="center"
          >
            <Ionicons name="cube" size={22} color="#7C5B9C" />
          </View>

          <YStack flex={1} gap="$1">
            <Text fontWeight="700" color="$textPrimary" fontSize="$4" numberOfLines={1}>
              {order.recipient_phone}
            </Text>
            <Text color="$textSecondary" fontSize={12} numberOfLines={1}>
              {formatDate(order.created_at)}
            </Text>
          </YStack>

          <Badge label={DELIVERY_ORDER_STATUS_LABELS[order.status]} backgroundColor={statusColor.bg} color={statusColor.text} glass={false} />
        </XStack>

        <YStack gap="$2">
          <InfoRow label="Ngày tạo đơn" value={formatDate(order.created_at)} />
          <InfoRow label="SĐT người gửi" value={order.sender_phone} />
          {!!order.sender_address && <InfoRow label="Địa chỉ gửi" value={order.sender_address} />}
          <InfoRow label="SĐT người nhận" value={order.recipient_phone} />
          <InfoRow label="Địa chỉ nhận" value={order.recipient_address} />
        </YStack>

        {primary && (
          <Button label={primary.label} variant="success" onPress={() => setStatus(primary.target)} loading={isPending} full />
        )}
        {secondary && !isPending && (
          <Text
            color="$danger"
            fontSize={13}
            fontWeight="600"
            textAlign="center"
            onPress={() => setStatus(secondary.target)}
          >
            {secondary.label}
          </Text>
        )}
      </YStack>
    </GlassSurface>
  )
}
