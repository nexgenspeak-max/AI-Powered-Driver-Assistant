import { useState } from 'react'
import { ScrollView } from 'react-native'
import { Text, useTheme } from 'tamagui'
import { useDriverContext } from '../../src/features/dashboard/hooks/useDriverContext'
import { useEarningsSummary } from '../../src/features/earnings/hooks/useEarningsSummary'
import { TodayEarningsCard } from '../../src/features/earnings/components/TodayEarningsCard'
import { EarningsPeriodTabs } from '../../src/features/earnings/components/EarningsPeriodTabs'
import { BonusList } from '../../src/features/earnings/components/BonusList'

export default function EarningsScreen() {
  const [period, setPeriod] = useState<'week' | 'month'>('week')
  const { data: context, isLoading: contextLoading } = useDriverContext()
  const { data: summary, isLoading: summaryLoading } = useEarningsSummary(period)
  const theme = useTheme()

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.surface.val }}
      contentContainerStyle={{ padding: 20, paddingTop: 64, paddingBottom: 100, gap: 16 }}
    >
      <Text fontSize="$7" fontWeight="800" color="$textPrimary">
        Earnings
      </Text>

      {!contextLoading && context && <TodayEarningsCard earnings={context.today_earnings} />}

      <EarningsPeriodTabs period={period} onPeriodChange={setPeriod} summary={summary} isLoading={summaryLoading} />

      {!contextLoading && context && <BonusList bonuses={context.active_bonuses} />}
    </ScrollView>
  )
}
