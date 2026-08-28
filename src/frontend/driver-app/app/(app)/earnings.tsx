import { useState } from 'react'
import { Screen } from '../../src/components/Screen'
import { AppText } from '../../src/components/AppText'
import { Skeleton } from '../../src/components/Skeleton'
import { useDriverContext } from '../../src/features/dashboard/hooks/useDriverContext'
import { useEarningsSummary } from '../../src/features/earnings/hooks/useEarningsSummary'
import { TodayEarningsCard } from '../../src/features/earnings/components/TodayEarningsCard'
import { EarningsPeriodTabs } from '../../src/features/earnings/components/EarningsPeriodTabs'
import { BonusList } from '../../src/features/earnings/components/BonusList'

export default function EarningsScreen() {
  const [period, setPeriod] = useState<'week' | 'month'>('week')
  const {
    data: context,
    isLoading: contextLoading,
    isError: contextError,
    refetch: refetchContext,
  } = useDriverContext()
  const {
    data: summary,
    isLoading: summaryLoading,
    isError: summaryError,
    refetch: refetchSummary,
  } = useEarningsSummary(period)

  return (
    <Screen scroll>
      <AppText variant="h1">Thu nhập</AppText>

      {contextLoading ? (
        <Skeleton height={120} radius={24} />
      ) : contextError ? (
        <ErrorRetry message="Không thể tải dữ liệu thu nhập hôm nay." onRetry={refetchContext} />
      ) : context ? (
        <TodayEarningsCard earnings={context.today_earnings} />
      ) : null}

      <EarningsPeriodTabs
        period={period}
        onPeriodChange={setPeriod}
        summary={summary}
        isLoading={summaryLoading}
        isError={summaryError}
        onRetry={refetchSummary}
      />

      {!contextLoading && !contextError && context && <BonusList bonuses={context.active_bonuses} />}
    </Screen>
  )
}

function ErrorRetry({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <AppText variant="body" color="$textSecondary" textAlign="center" paddingVertical="$4" onPress={onRetry}>
      {message} Nhấn để thử lại.
    </AppText>
  )
}
