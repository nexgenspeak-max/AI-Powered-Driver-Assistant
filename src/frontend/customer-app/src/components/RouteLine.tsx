import { View, XStack, YStack } from 'tamagui'
import { AppText } from './AppText'

// Pickup → dropoff shown the way the map already shows it: a coloured origin
// dot, a connector, a square destination marker. Replaces the stack of
// identical "Pickup / Dropoff" InfoRows in every trip card / banner / status
// screen.
//
// Duplicated in customer-app/src/components/RouteLine.tsx.

export type RouteLineProps = {
  pickup: string
  dropoff: string
  pickupLabel?: string
  dropoffLabel?: string
}

export function RouteLine({
  pickup,
  dropoff,
  pickupLabel = 'Điểm đón',
  dropoffLabel = 'Điểm đến',
}: RouteLineProps) {
  return (
    <XStack gap="$3">
      <YStack alignItems="center" paddingTop={5}>
        <View width={10} height={10} borderRadius={5} backgroundColor="$primary" />
        <View
          width={2}
          flex={1}
          minHeight={18}
          marginVertical={4}
          backgroundColor="$borderStrong"
        />
        <View width={10} height={10} borderRadius={3} backgroundColor="$success" />
      </YStack>

      <YStack flex={1} gap="$3">
        <YStack gap={2}>
          <AppText variant="caption" color="$textMuted">
            {pickupLabel}
          </AppText>
          <AppText variant="bodyStrong" numberOfLines={2}>
            {pickup}
          </AppText>
        </YStack>
        <YStack gap={2}>
          <AppText variant="caption" color="$textMuted">
            {dropoffLabel}
          </AppText>
          <AppText variant="bodyStrong" numberOfLines={2}>
            {dropoff}
          </AppText>
        </YStack>
      </YStack>
    </XStack>
  )
}
