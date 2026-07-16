import { TouchableOpacity } from 'react-native'
import { YStack, XStack, Text } from 'tamagui'
import { Ionicons } from '@expo/vector-icons'
import { Card } from '../../../components/Card'
import { Badge } from '../../../components/Badge'
import { TRIP_STATUS_LABELS, TRIP_STATUS_COLORS } from '../../../constants/status'
import { formatDate } from '../../../utils/format'
import type { Trip } from '../../../types'

export function TripHistoryItem({ trip, onPress }: { trip: Trip; onPress: () => void }) {
  const statusColor = TRIP_STATUS_COLORS[trip.status]

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      <Card gap="$2">
        <XStack alignItems="center" justifyContent="space-between">
          <Badge label={TRIP_STATUS_LABELS[trip.status]} backgroundColor={statusColor.bg} color={statusColor.text} />
          <Text color="$textSecondary" fontSize={11}>
            {formatDate(trip.created_at)}
          </Text>
        </XStack>

        <YStack gap="$1">
          <XStack alignItems="flex-start" gap="$2">
            <Ionicons name="ellipse" size={8} color="#6c8aff" style={{ marginTop: 5 }} />
            <Text color="$textPrimary" fontSize="$3" flex={1} numberOfLines={1}>
              {trip.pickup_address}
            </Text>
          </XStack>
          <XStack alignItems="flex-start" gap="$2">
            <Ionicons name="location" size={10} color="#401f68" style={{ marginTop: 3 }} />
            <Text color="$textPrimary" fontSize="$3" flex={1} numberOfLines={1}>
              {trip.dropoff_address}
            </Text>
          </XStack>
        </YStack>

        {!!trip.driver_phone && (
          <Text color="$textSecondary" fontSize={11}>
            Driver: {trip.driver_phone}
          </Text>
        )}
      </Card>
    </TouchableOpacity>
  )
}
