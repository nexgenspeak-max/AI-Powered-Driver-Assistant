import { XStack, YStack, View, useTheme } from 'tamagui'
import { Ionicons } from '@expo/vector-icons'
import { AppText } from '../../../components/AppText'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Surface } from '../../../components/Surface'
import { Badge } from '../../../components/Badge'
import { Button } from '../../../components/Button'
import { InfoRow } from '../../dashboard/components/InfoRow'
import { formatDate } from '../../../utils/format'
import { confirmDestructive } from '../../../utils/confirmDialog'
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
  const theme = useTheme()
  const qc = useQueryClient()
  const { mutate: setStatus, isPending } = useMutation({
    mutationFn: (status: DeliveryOrderStatus) => deliveryOrdersService.updateStatus(order.order_id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['deliveryOrders'] }),
  })

  const primary = NEXT_ACTION[order.status]
  const secondary = SECONDARY_ACTION[order.status]
  const statusColor = DELIVERY_ORDER_STATUS_COLORS[order.status]

  const onSecondaryPress = () => {
    if (!secondary) return
    if (secondary.target === 'returned') {
      confirmDestructive({
        title: 'Trả hàng?',
        message: 'Đơn hàng sẽ được đánh dấu là đã trả lại, không thể hoàn tác.',
        cancelLabel: 'Huỷ',
        confirmLabel: 'Trả hàng',
        onConfirm: () => setStatus(secondary.target),
      })
    } else {
      setStatus(secondary.target)
    }
  }

  return (
    <Surface clip borderRadius={24} width="100%">
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
            <Ionicons name="cube" size={22} color={theme.primary.val} />
          </View>

          <YStack flex={1} gap="$1">
            <AppText variant="title" numberOfLines={1}>
              {order.recipient_phone}
            </AppText>
            <AppText variant="caption" color="$textSecondary" numberOfLines={1}>
              {formatDate(order.created_at)}
            </AppText>
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
          <AppText
            variant="label"
            color="$danger"
            textAlign="center"
            paddingVertical="$2"
            minHeight={44}
            hitSlop={10}
            accessibilityRole="button"
            onPress={onSecondaryPress}
          >
            {secondary.label}
          </AppText>
        )}
      </YStack>
    </Surface>
  )
}
