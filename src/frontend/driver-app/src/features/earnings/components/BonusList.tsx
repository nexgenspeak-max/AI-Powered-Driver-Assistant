import { View, Text } from 'react-native'
import { Card } from '../../../components/Card'
import type { Bonus } from '../../../types'

export function BonusList({ bonuses }: { bonuses: Bonus[] }) {
  if (bonuses.length === 0) return null
  return (
    <View className="gap-3">
      <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Active bonuses</Text>
      {bonuses.map((bonus, i) => (
        <Card key={i} className="flex-row items-center justify-between bg-yellow-50 border-yellow-200">
          <View className="flex-1 pr-2">
            <Text className="text-gray-900 font-medium">{bonus.description}</Text>
            <Text className="text-gray-400 text-xs mt-0.5">Expires {bonus.expires_at}</Text>
          </View>
          <Text className="text-yellow-700 font-bold text-lg">{bonus.amount}</Text>
        </Card>
      ))}
    </View>
  )
}
