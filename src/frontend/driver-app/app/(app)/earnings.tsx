import { useState } from 'react'
import { View, Text, ScrollView } from 'react-native'
import { useDriverContext } from '../../src/features/dashboard/hooks/useDriverContext'
import { useEarningsSummary } from '../../src/features/earnings/hooks/useEarningsSummary'
import { TodayEarningsCard } from '../../src/features/earnings/components/TodayEarningsCard'
import { EarningsPeriodTabs } from '../../src/features/earnings/components/EarningsPeriodTabs'
import { BonusList } from '../../src/features/earnings/components/BonusList'

export default function EarningsScreen() {
  const [period, setPeriod] = useState<'week' | 'month'>('week')
  const { data: context, isLoading: contextLoading } = useDriverContext()
  const { data: summary, isLoading: summaryLoading } = useEarningsSummary(period)

  return (
    <ScrollView className="flex-1 bg-surface" contentContainerClassName="p-5 pt-16 gap-4">
      <Text className="text-2xl font-extrabold text-gray-900">Earnings</Text>

      {!contextLoading && context && <TodayEarningsCard earnings={context.today_earnings} />}

      <EarningsPeriodTabs period={period} onPeriodChange={setPeriod} summary={summary} isLoading={summaryLoading} />

      {!contextLoading && context && <BonusList bonuses={context.active_bonuses} />}
    </ScrollView>
  )
}
