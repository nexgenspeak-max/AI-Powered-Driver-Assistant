import { View, Text, TouchableOpacity } from 'react-native'
import { Card } from '../../../components/Card'
import { formatCurrency } from '../../../utils/format'
import type { EarningsSummary } from '../../../types'

interface Props {
  period: 'week' | 'month'
  onPeriodChange: (period: 'week' | 'month') => void
  summary?: EarningsSummary
  isLoading: boolean
}

export function EarningsPeriodTabs({ period, onPeriodChange, summary, isLoading }: Props) {
  return (
    <Card className="gap-3">
      <View className="flex-row bg-gray-100 rounded-xl p-1">
        {(['week', 'month'] as const).map(p => (
          <TouchableOpacity
            key={p}
            onPress={() => onPeriodChange(p)}
            className={`flex-1 py-2 rounded-lg items-center ${period === p ? 'bg-white' : ''}`}
          >
            <Text className={period === p ? 'font-semibold text-gray-900' : 'text-gray-500'}>
              {p === 'week' ? 'Last 7 days' : 'Last 30 days'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading || !summary ? (
        <Text className="text-gray-400 text-sm">Loading...</Text>
      ) : (
        <View>
          <Text className="text-2xl font-extrabold text-gray-900">{formatCurrency(summary.total_earnings, summary.currency)}</Text>
          <Text className="text-gray-400 text-sm mt-1">{summary.trip_count} trips completed</Text>
        </View>
      )}
    </Card>
  )
}
