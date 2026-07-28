import { XStack, YStack, Text } from 'tamagui'
import { GlassSurface } from '../../../components/GlassSurface'
import { formatCurrency } from '../../../utils/format'
import type { TodayEarnings } from '../../../types'

export function TodayEarningsCard({ earnings }: { earnings: TodayEarnings }) {
  return (
    <GlassSurface cornerRadius={18}>
      <YStack gap="$1" padding="$4">
        <Text color="$textPrimary" fontSize="$1" textTransform="uppercase" letterSpacing={0.5} fontWeight="600">
          Today's earnings
        </Text>
        <Text color="$textPrimary" fontSize="$8" fontWeight="800">
          {formatCurrency(earnings.total_earnings, earnings.currency)}
        </Text>
        <XStack gap="$4" marginTop="$2">
          <Text color="$textSecondary" fontSize="$1">
            {earnings.trip_count} trips
          </Text>
          <Text color="$textSecondary" fontSize="$1">
            {earnings.hours_online.toFixed(1)}h online
          </Text>
          {earnings.bonus_earnings > 0 && (
            <Text color="$textSecondary" fontSize="$1">
              +{formatCurrency(earnings.bonus_earnings, earnings.currency)} bonus
            </Text>
          )}
        </XStack>
      </YStack>
    </GlassSurface>
  )
}
