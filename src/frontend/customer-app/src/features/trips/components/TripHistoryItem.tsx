import { TouchableOpacity } from 'react-native'
import { XStack, YStack, View } from 'tamagui'
import { Surface } from '../../../components/Surface'
import { AppText } from '../../../components/AppText'
import { Badge } from '../../../components/Badge'
import { TRIP_STATUS_LABELS, TRIP_STATUS_COLORS } from '../../../constants/status'
import { formatDate } from '../../../utils/format'
import type { Trip } from '../../../types'

export function TripHistoryItem({ trip, onPress }: { trip: Trip; onPress: () => void }) {
  const statusColor = TRIP_STATUS_COLORS[trip.status]
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} accessibilityRole="button">
      <Surface padding="$4" gap="$3">
        <XStack alignItems="center" justifyContent="space-between" gap="$2">
          <AppText variant="caption" color="$textSecondary">
            {formatDate(trip.created_at)}
          </AppText>
          <Badge
            label={TRIP_STATUS_LABELS[trip.status]}
            backgroundColor={statusColor.bg}
            color={statusColor.text}
            glass={false}
          />
        </XStack>
        <XStack gap="$3">
          <YStack alignItems="center" paddingTop={5}>
            <View width={8} height={8} borderRadius={4} backgroundColor="$primary" />
            <View width={2} flex={1} minHeight={14} marginVertical={3} backgroundColor="$borderStrong" />
            <View width={8} height={8} borderRadius={2} backgroundColor="$success" />
          </YStack>
          <YStack flex={1} gap="$2">
            <AppText variant="body" numberOfLines={1}>
              {trip.pickup_address}
            </AppText>
            <AppText variant="body" numberOfLines={1}>
              {trip.dropoff_address}
            </AppText>
          </YStack>
        </XStack>
      </Surface>
    </TouchableOpacity>
  )
}
