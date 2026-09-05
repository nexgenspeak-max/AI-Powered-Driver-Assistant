import { TouchableOpacity } from 'react-native'
import { YStack } from 'tamagui'
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
  currency?: string
  isLoading: boolean
  isError?: boolean
  onRetry?: () => void
}

export function EarningsPeriodTabs({
  period,
  onPeriodChange,
  totalEarnings,
  tripCount,
  currency = 'VND',
  isLoading,
  isError,
  onRetry,
}: Props) {
  const hasTotals = totalEarnings != null && tripCount != null

  return (
    <Surface clip borderRadius={24} padding="$4" gap="$3">
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
          <AppText variant="body" color="$textSecondary" paddingTop="$1">
            Không thể tải dữ liệu. Nhấn để thử lại.
          </AppText>
        </TouchableOpacity>
      ) : isLoading || !hasTotals ? (
        <YStack gap="$2" paddingTop="$1">
          <Skeleton width={160} height={28} />
          <Skeleton width={120} height={14} />
        </YStack>
      ) : (
        <YStack gap="$1">
          <AppText variant="label" color="$textSecondary">
            Tổng thu nhập
          </AppText>
          <AppText variant="h1">{formatCurrency(totalEarnings, currency)}</AppText>
          <AppText variant="caption" color="$textSecondary">
            {tripCount} chuyến hoàn thành
          </AppText>
        </YStack>
      )}
    </Surface>
  )
}
