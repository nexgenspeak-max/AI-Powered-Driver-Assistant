import { useMemo, useState } from 'react'
import { TouchableOpacity } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { YStack } from 'tamagui'
import { Screen } from '../../src/components/Screen'
import { AppText } from '../../src/components/AppText'
import { Skeleton } from '../../src/components/Skeleton'
import { SearchInput } from '../../src/components/SearchInput'
import { useDriverContext } from '../../src/features/dashboard/hooks/useDriverContext'
import { useEarningsSummary } from '../../src/features/earnings/hooks/useEarningsSummary'
import {
  EarningsPeriodTabs,
  type EarningsPeriod,
} from '../../src/features/earnings/components/EarningsPeriodTabs'
import {
  CompletedTripEarningsList,
  filterCompletedTripsForPeriod,
  filterTripsByQuery,
} from '../../src/features/earnings/components/CompletedTripEarningsList'

/**
 * Sticky chrome (title, period, search); only trip detail list scrolls.
 */
export default function EarningsScreen() {
  const insets = useSafeAreaInsets()
  const [period, setPeriod] = useState<EarningsPeriod>('today')
  const [query, setQuery] = useState('')
  const {
    data: context,
    isLoading: contextLoading,
    isError: contextError,
    refetch: refetchContext,
  } = useDriverContext()

  const needSummary = period === 'week' || period === 'month'
  const {
    data: summary,
    isLoading: summaryLoading,
    isError: summaryError,
    refetch: refetchSummary,
  } = useEarningsSummary(period === 'month' ? 'month' : 'week', {
    enabled: needSummary,
  })

  const periodTrips = useMemo(
    () => filterCompletedTripsForPeriod(context?.completed_trips ?? [], period),
    [context?.completed_trips, period],
  )

  const visibleTrips = useMemo(
    () => filterTripsByQuery(periodTrips, query),
    [periodTrips, query],
  )

  const totals =
    period === 'today' && context
      ? {
          totalEarnings: context.today_earnings.total_earnings,
          tripCount: context.today_earnings.trip_count,
          currency: context.today_earnings.currency,
          isLoading: false,
          isError: false as boolean,
        }
      : {
          totalEarnings: summary?.total_earnings,
          tripCount: summary?.trip_count,
          currency: summary?.currency ?? 'VND',
          isLoading: summaryLoading,
          isError: summaryError,
        }

  const q = query.trim()
  const shownCount = periodTrips.length
  const reportedCount = totals.tripCount
  const listTruncated =
    !q && reportedCount != null && reportedCount > shownCount && shownCount > 0

  const listCaption = q
    ? visibleTrips.length > 0
      ? `${visibleTrips.length}/${periodTrips.length} chuyến khớp “${q}”`
      : undefined
    : listTruncated
      ? `Đang hiển thị ${shownCount}/${reportedCount} chuyến gần đây`
      : undefined

  const emptyMessage = q
    ? `Không tìm thấy chuyến khớp “${q}”.`
    : 'Chưa có chuyến hoàn thành trong khoảng thời gian này.'

  const header = (
    <YStack
      backgroundColor="$background"
      paddingTop={insets.top + 16}
      paddingHorizontal={20}
      paddingBottom="$4"
      gap="$4"
      borderBottomWidth={1}
      borderBottomColor="$border"
    >
      <YStack gap="$2">
        <AppText variant="h1">Thu nhập</AppText>
        <AppText variant="body" color="$textSecondary">
          Tổng theo kỳ và chi tiết từng chuyến đã hoàn thành.
        </AppText>
      </YStack>

      {contextLoading && !context ? (
        <Skeleton height={120} radius={24} />
      ) : contextError && !context ? (
        <ErrorRetry message="Không thể tải dữ liệu thu nhập." onRetry={refetchContext} />
      ) : (
        <>
          <EarningsPeriodTabs
            period={period}
            onPeriodChange={(next) => {
              setPeriod(next)
              setQuery('')
            }}
            totalEarnings={totals.totalEarnings}
            tripCount={totals.tripCount}
            currency={totals.currency}
            isLoading={totals.isLoading}
            isError={totals.isError}
            onRetry={refetchSummary}
          />
          <SearchInput
            value={query}
            onChangeText={setQuery}
            placeholder="Tìm theo tên khách hoặc địa chỉ..."
          />
        </>
      )}
    </YStack>
  )

  return (
    <Screen scroll header={header}>
      {context ? (
        <CompletedTripEarningsList
          trips={visibleTrips}
          truncationNote={listCaption}
          emptyMessage={emptyMessage}
        />
      ) : null}
    </Screen>
  )
}

function ErrorRetry({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <TouchableOpacity
      onPress={onRetry}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`${message} Nhấn để thử lại.`}
      style={{ minHeight: 44, justifyContent: 'center' }}
    >
      <AppText variant="body" color="$textSecondary" textAlign="center" paddingVertical="$4">
        {message} Nhấn để thử lại.
      </AppText>
    </TouchableOpacity>
  )
}
