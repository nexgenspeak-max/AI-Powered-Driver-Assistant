import { TouchableOpacity } from 'react-native'
import { XStack, YStack, View, Text, useTheme } from 'tamagui'
import { Ionicons } from '@expo/vector-icons'
import { Card } from '../../../components/Card'
import { Badge } from '../../../components/Badge'
import { TRIP_STATUS_LABELS, TRIP_STATUS_COLORS } from '../../../constants/status'
import { formatDate } from '../../../utils/format'
import type { Trip } from '../../../types'

export function TripHistoryItem({ trip, onPress }: { trip: Trip; onPress: () => void }) {
  const statusColor = TRIP_STATUS_COLORS[trip.status]
  const theme = useTheme()

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.75}>
      <Card padding="$3">
        <XStack alignItems="center" gap="$3">
          <View width={44} height={44} borderRadius={22} backgroundColor={statusColor.bg} alignItems="center" justifyContent="center">
            <Ionicons name="car" size={20} color={theme.textPrimary.val} />
          </View>
          <YStack flex={1} gap="$1">
            <Text color="$textPrimary" fontSize="$3" fontWeight="600" numberOfLines={1}>
              {trip.pickup_address} → {trip.dropoff_address}
            </Text>
            <Text color="$textSecondary" fontSize={12} numberOfLines={1}>
              {formatDate(trip.created_at)}
              {trip.driver_phone ? ` · ${trip.driver_phone}` : ''}
            </Text>
          </YStack>
          <Badge label={TRIP_STATUS_LABELS[trip.status]} backgroundColor={statusColor.bg} color={statusColor.text} />
        </XStack>
      </Card>
    </TouchableOpacity>
  )
}
