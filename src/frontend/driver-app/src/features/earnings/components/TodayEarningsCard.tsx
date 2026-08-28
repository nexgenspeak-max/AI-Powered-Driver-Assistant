import { XStack } from 'tamagui'
import { Surface } from '../../../components/Surface'
import { AppText } from '../../../components/AppText'
import { formatCurrency } from '../../../utils/format'
import type { TodayEarnings } from '../../../types'

export function TodayEarningsCard({ earnings }: { earnings: TodayEarnings }) {
  return (
    <Surface clip borderRadius={24} padding="$5" gap="$2">
      <AppText variant="label" color="$textSecondary">
        Thu nhập hôm nay
      </AppText>
      <AppText variant="display">
        {formatCurrency(earnings.total_earnings, earnings.currency)}
      </AppText>
      <XStack gap="$4" marginTop="$1" flexWrap="wrap">
        <AppText variant="caption" color="$textSecondary">
          {earnings.trip_count} chuyến
        </AppText>
        <AppText variant="caption" color="$textSecondary">
          {earnings.hours_online.toFixed(1)}h online
        </AppText>
        {earnings.bonus_earnings > 0 && (
          <AppText variant="caption" color="$success">
            +{formatCurrency(earnings.bonus_earnings, earnings.currency)} thưởng
          </AppText>
        )}
      </XStack>
    </Surface>
  )
}
