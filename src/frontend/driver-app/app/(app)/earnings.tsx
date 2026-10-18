import { useMemo, useState } from 'react'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { YStack } from 'tamagui'
import { Screen } from '../../src/components/Screen'
import { AppText } from '../../src/components/AppText'
import { Skeleton } from '../../src/components/Skeleton'
import { SearchInput } from '../../src/components/SearchInput'
import { EmptyState } from '../../src/components/EmptyState'
import { useDriverContext } from '../../src/features/dashboard/hooks/useDriverContext'
import { useOnlineToggle } from '../../src/features/dashboard/hooks/useOnlineToggle'
import { useEarningsSummary } from '../../src/features/earnings/hooks/useEarningsSummary'
import { EarningsHero, type EarningsPeriod } from '../../src/features/earnings/components/EarningsHero'
import { WeeklyEarningsChart } from '../../src/features/earnings/components/WeeklyEarningsChart'
import {
  CompletedTripEarningsList,
  filterCompletedTripsForPeriod,
  filterTripsByQuery,
} from '../../src/features/earnings/components/CompletedTripEarningsList'

/**
 * Thu nhập — wallet layout: sticky title + hero (figure, period, stats);
 * scroll area holds the 7-day chart and the day-grouped history.
 */
export default function EarningsScreen() {
  const insets = useSafeAreaInsets()
  const [period, setPeriod] = useState<EarningsPeriod>('today')
  const [query, setQuery] = useState('')
  const { data: context, isLoading: contextLoading, isError: contextError, refetch: refetchContext } = useDriverContext()
  const { isOnline, setOnline, ready } = useOnlineToggle()

  const needSummary = period === 'week' || period === 'month'
  const {
    data: summary,
    isLoading: summaryLoading,
    isError: summaryError,
    refetch: refetchSummary,
  } = useEarningsSummary(period === 'month' ? 'month' : 'week', { enabled: needSummary })

  const completed = context?.completed_trips ?? []
  const periodTrips = useMemo(() => filterCompletedTripsForPeriod(completed, period), [completed, period])
  const visibleTrips = useMemo(() => filterTripsByQuery(periodTrips, query), [periodTrips, query])
  const weekTrips = useMemo(() => filterCompletedTripsForPeriod(completed, 'week'), [completed])

  const totals =
    period === 'today' && context
      ? {
          totalEarnings: context.today_earnings.total_earnings,
          tripCount: context.today_earnings.trip_count,
          hoursOnline: context.today_earnings.hours_online,
          bonusEarnings: context.today_earnings.bonus_earnings,
          currency: context.today_earnings.currency,
          isLoading: false,
          isError: false as boolean,
        }
      : {
          totalEarnings: summary?.total_earnings,
          tripCount: summary?.trip_count,
          hoursOnline: undefined,
          bonusEarnings: undefined,
          currency: summary?.currency ?? 'VND',
          isLoading: summaryLoading,
          isError: summaryError,
        }

  const q = query.trim()
  const reportedCount = totals.tripCount
  const listTruncated = !q && reportedCount != null && reportedCount > periodTrips.length && periodTrips.length > 0
  const listCaption = q
    ? visibleTrips.length > 0
      ? `${visibleTrips.length}/${periodTrips.length} chuyến khớp “${q}”`
      : undefined
    : listTruncated
      ? `${periodTrips.length}/${reportedCount} chuyến gần đây`
      : undefined

  const header = (
    <YStack
      backgroundColor="$background"
      paddingTop={insets.top + 16}
      paddingHorizontal="$5"
      paddingBottom="$4"
      gap="$4"
      borderBottomWidth={1}
      borderBottomColor="$border"
    >
      <AppText variant="h1">Thu nhập</AppText>
      {contextLoading && !context ? (
        <Skeleton height={168} radius={24} />
      ) : contextError && !context ? (
        <EmptyState
          icon="alert-circle"
          title="Không thể tải thu nhập"
          message="Kiểm tra kết nối rồi thử lại."
          actionLabel="Thử lại"
          onAction={() => refetchContext()}
        />
      ) : (
        <EarningsHero
          period={period}
          onPeriodChange={next => {
            setPeriod(next)
            setQuery('')
          }}
          totalEarnings={totals.totalEarnings}
          tripCount={totals.tripCount}
          hoursOnline={totals.hoursOnline}
          bonusEarnings={totals.bonusEarnings}
          currency={totals.currency}
          isLoading={totals.isLoading}
          isError={totals.isError}
          onRetry={refetchSummary}
        />
      )}
    </YStack>
  )

  return (
    <Screen scroll header={header}>
      {context ? (
        <>
          <WeeklyEarningsChart trips={weekTrips} currency={context.today_earnings.currency} />

          {completed.length === 0 ? (
            <EmptyState
              icon="wallet"
              title="Chưa có thu nhập"
              message={isOnline ? 'Hoàn thành chuyến đầu tiên để thấy thu nhập ở đây.' : 'Bật nhận chuyến để bắt đầu kiếm tiền hôm nay.'}
              actionLabel={!isOnline && ready ? 'Bật nhận chuyến' : undefined}
              onAction={!isOnline && ready ? () => setOnline(true) : undefined}
            />
          ) : (
            <>
              <SearchInput value={query} onChangeText={setQuery} placeholder="Tìm theo tên khách hoặc địa chỉ..." />
              <CompletedTripEarningsList
                trips={visibleTrips}
                truncationNote={listCaption}
                emptyMessage={q ? `Không tìm thấy chuyến khớp “${q}”.` : 'Chưa có chuyến hoàn thành trong khoảng thời gian này.'}
              />
            </>
          )}
        </>
      ) : null}
    </Screen>
  )
}
