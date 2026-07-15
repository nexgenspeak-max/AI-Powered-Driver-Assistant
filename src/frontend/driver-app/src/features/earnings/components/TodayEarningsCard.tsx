import { View, Text } from 'react-native'
import { Card } from '../../../components/Card'
import { formatCurrency } from '../../../utils/format'
import type { TodayEarnings } from '../../../types'

export function TodayEarningsCard({ earnings }: { earnings: TodayEarnings }) {
  return (
    <Card className="gap-1">
      <Text className="text-gray-500 text-xs uppercase tracking-wider font-medium">Today's earnings</Text>
      <Text className="text-gray-900 text-3xl font-extrabold">{formatCurrency(earnings.total_earnings, earnings.currency)}</Text>
      <View className="flex-row gap-4 mt-2">
        <Text className="text-gray-500 text-xs">{earnings.trip_count} trips</Text>
        <Text className="text-gray-500 text-xs">{earnings.hours_online.toFixed(1)}h online</Text>
        {earnings.bonus_earnings > 0 && (
          <Text className="text-gray-500 text-xs">+{formatCurrency(earnings.bonus_earnings, earnings.currency)} bonus</Text>
        )}
      </View>
    </Card>
  )
}
