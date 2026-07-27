import { Image } from 'react-native'
import { XStack, YStack, View, Text } from 'tamagui'
import { Ionicons } from '@expo/vector-icons'
import { GlassSurface } from '../../../components/GlassSurface'
import { Badge } from '../../../components/Badge'
import { InfoRow } from '../../dashboard/components/InfoRow'
import { formatDate } from '../../../utils/format'
import type { DeliveryOrder } from '../../../types'

export function DeliveryOrderCard({ order }: { order: DeliveryOrder }) {
  return (
    <GlassSurface style={{ width: '100%' }}>
      <YStack padding="$4" gap="$3">
        <XStack alignItems="center" gap="$3">
          <View
            width={48}
            height={48}
            borderRadius={24}
            backgroundColor="#EDE4FB"
            alignItems="center"
            justifyContent="center"
            overflow="hidden"
          >
            {order.photo_uri ? (
              <Image source={{ uri: order.photo_uri }} style={{ width: 48, height: 48 }} resizeMode="cover" />
            ) : (
              <Ionicons name="cube" size={22} color="#7C3AED" />
            )}
          </View>

          <YStack flex={1} gap="$1">
            <Text fontWeight="700" color="$textPrimary" fontSize="$4" numberOfLines={1}>
              {order.recipient_phone}
            </Text>
            <Text color="$textSecondary" fontSize={12} numberOfLines={1}>
              {formatDate(order.created_at)}
            </Text>
          </YStack>

          <Badge label="Đã ghi nhận" backgroundColor="#EDE4FB" color="#7C3AED" glass={false} />
        </XStack>

        <YStack gap="$2">
          <InfoRow label="Ngày tạo đơn" value={formatDate(order.created_at)} />
          <InfoRow label="SĐT người gửi" value={order.sender_phone} />
          {!!order.sender_address && <InfoRow label="Địa chỉ gửi" value={order.sender_address} />}
          <InfoRow label="SĐT người nhận" value={order.recipient_phone} />
          <InfoRow label="Địa chỉ nhận" value={order.recipient_address} />
        </YStack>
      </YStack>
    </GlassSurface>
  )
}
