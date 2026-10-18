import { TouchableOpacity } from 'react-native'
import { XStack, YStack, View } from 'tamagui'
import { Surface } from '../../../components/Surface'
import { AppText } from '../../../components/AppText'
import { Skeleton } from '../../../components/Skeleton'
import { SegmentedControl } from '../../../components/SegmentedControl'
import { formatCurrency } from '../../../utils/format'

export type EarningsPeriod = 'today' | 'week' | 'month'

interface Props {
  period: EarningsPeriod
  onPeriodChange: (period: EarningsPeriod) => void
  totalEarnings?: number
  tripCount?: number
  hoursOnline?: number
  bonusEarnings?: number
  currency?: string
  isLoading: boolean
  isError?: boolean
  onRetry?: () => void
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <YStack flex={1} gap={2}>
      <AppText variant="caption" color="$textSecondary">
        {label}
      </AppText>
      <AppText variant="title">{value}</AppText>
    </YStack>
  )
}

// Wallet-style hero: the figure first (display size), the period under it,
// then three small stats. One card, read top-down in one glance.
export function EarningsHero({
  period,
  onPeriodChange,
  totalEarnings,
  tripCount,
  hoursOnline,
  bonusEarnings,
  currency = 'VND',
  isLoading,
  isError,
  onRetry,
}: Props) {
  const hasTotals = totalEarnings != null && tripCount != null
  const perTrip = hasTotals && tripCount > 0 ? Math.round(totalEarnings / tripCount) : null

  return (
    <Surface clip borderRadius={24} padding="$4" gap="$4">
      <SegmentedControl<EarningsPeriod>
        value={period}
        onChange={onPeriodChange}
        options={[
          { value: 'today', label: 'Hôm nay' },
          { value: 'week', label: '7 ngày' },
          { value: 'month', label: '30 ngày' },
        ]}
      />

      {isError ? (
        <TouchableOpacity
          onPress={onRetry}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Không thể tải dữ liệu. Nhấn để thử lại."
          style={{ minHeight: 44, justifyContent: 'center' }}
        >
          <AppText variant="body" color="$textSecondary">
            Không thể tải dữ liệu. Nhấn để thử lại.
          </AppText>
        </TouchableOpacity>
      ) : isLoading || !hasTotals ? (
        <YStack gap="$2">
          <Skeleton width={200} height={34} />
          <Skeleton width={140} height={14} />
        </YStack>
      ) : (
        <YStack gap="$3">
          <YStack gap={2}>
            <AppText variant="label" color="$textSecondary">
              Tổng thu nhập
            </AppText>
            <AppText variant="display" numberOfLines={1} adjustsFontSizeToFit>
              {formatCurrency(totalEarnings, currency)}
            </AppText>
          </YStack>
          <View height={1} backgroundColor="$divider" />
          <XStack gap="$3">
            <Stat label="Chuyến" value={String(tripCount)} />
            <Stat label="TB/chuyến" value={perTrip != null ? formatCurrency(perTrip, currency) : '—'} />
            {hoursOnline != null ? (
              <Stat label="Giờ online" value={`${hoursOnline.toFixed(1).replace(".", ",")} giờ`} />
            ) : bonusEarnings != null ? (
              <Stat label="Thưởng" value={formatCurrency(bonusEarnings, currency)} />
            ) : null}
          </XStack>
        </YStack>
      )}
    </Surface>
  )
}
