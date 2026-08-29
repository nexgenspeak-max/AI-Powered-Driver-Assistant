import { TouchableOpacity } from 'react-native'
import { YStack } from 'tamagui'
import { Surface } from '../../../components/Surface'
import { AppText } from '../../../components/AppText'
import { Skeleton } from '../../../components/Skeleton'
import { SegmentedControl } from '../../../components/SegmentedControl'
import { formatCurrency } from '../../../utils/format'
import type { EarningsSummary } from '../../../types'

interface Props {
  period: 'week' | 'month'
  onPeriodChange: (period: 'week' | 'month') => void
  summary?: EarningsSummary
  isLoading: boolean
  isError?: boolean
  onRetry?: () => void
}

export function EarningsPeriodTabs({ period, onPeriodChange, summary, isLoading, isError, onRetry }: Props) {
  return (
    <Surface clip borderRadius={24} padding="$4" gap="$3">
      <SegmentedControl<'week' | 'month'>
        value={period}
        onChange={onPeriodChange}
        options={[
          { value: 'week', label: '7 ngày qua' },
          { value: 'month', label: '30 ngày qua' },
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
      ) : isLoading || !summary ? (
        <YStack gap="$2" paddingTop="$1">
          <Skeleton width={160} height={28} />
          <Skeleton width={120} height={14} />
        </YStack>
      ) : (
        <YStack gap="$1">
          <AppText variant="h1">
            {formatCurrency(summary.total_earnings, summary.currency)}
          </AppText>
          <AppText variant="caption" color="$textSecondary">
            {summary.trip_count} chuyến hoàn thành
          </AppText>
        </YStack>
      )}
    </Surface>
  )
}
