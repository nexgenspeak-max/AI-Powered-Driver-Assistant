import { ScrollView } from 'react-native'
import { View, YStack, XStack, Text, useTheme } from 'tamagui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Card } from '../../../components/Card'
import { Badge } from '../../../components/Badge'
import { getBackButtonClearance } from '../../../components/BackButton'
import { TRIP_STATUS_LABELS, TRIP_STATUS_COLORS } from '../../../constants/status'
import type { Trip } from '../../../types'

export function TripStatusCard({ trip }: { trip: Trip }) {
  const statusColor = TRIP_STATUS_COLORS[trip.status]
  const theme = useTheme()
  const insets = useSafeAreaInsets()

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.surface.val }}
      contentContainerStyle={{ padding: 20, paddingTop: getBackButtonClearance(insets.top) + 16, paddingBottom: 100, gap: 16 }}
    >
      <View>
        <Text fontSize="$7" fontWeight="800" color="$textPrimary">
          Trip Status
        </Text>
        <Text color="$textSecondary" fontSize="$3" marginTop="$1">
          #{trip.trip_id}
        </Text>
      </View>

      <Card gap="$3">
        <Badge label={TRIP_STATUS_LABELS[trip.status]} backgroundColor={statusColor.bg} color={statusColor.text} />

        <YStack gap="$1">
          <Text fontSize={11} color="$textSecondary" textTransform="uppercase" letterSpacing={0.5}>
            Pickup
          </Text>
          <Text color="$textPrimary" fontSize="$4">
            {trip.pickup_address}
          </Text>
        </YStack>
        <YStack gap="$1">
          <Text fontSize={11} color="$textSecondary" textTransform="uppercase" letterSpacing={0.5}>
            Dropoff
          </Text>
          <Text color="$textPrimary" fontSize="$4">
            {trip.dropoff_address}
          </Text>
        </YStack>

        {!!trip.driver_phone && (
          <YStack gap="$1">
            <Text fontSize={11} color="$textSecondary" textTransform="uppercase" letterSpacing={0.5}>
              Driver
            </Text>
            <Text color="$textPrimary" fontSize="$4">
              {trip.driver_phone}
            </Text>
          </YStack>
        )}

        {(trip.distance_km > 0 || trip.eta_minutes > 0) && (
          <XStack gap="$4">
            {trip.distance_km > 0 && (
              <Text fontSize="$3" color="$textSecondary">
                {trip.distance_km.toFixed(1)} km
              </Text>
            )}
            {trip.eta_minutes > 0 && (
              <Text fontSize="$3" color="$textSecondary">
                {trip.eta_minutes} min ETA
              </Text>
            )}
          </XStack>
        )}
      </Card>
    </ScrollView>
  )
}
