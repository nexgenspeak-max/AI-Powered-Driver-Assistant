import { View, Text } from 'react-native'
import { Card } from '../../../components/Card'
import { Badge } from '../../../components/Badge'
import type { Customer } from '../../../types'

interface Props {
  customer: Customer
}

export function ProfileCard({ customer }: Props) {
  return (
    <Card className="items-center gap-2 py-6">
      <View className="w-16 h-16 rounded-full bg-primary items-center justify-center">
        <Text className="text-white text-2xl font-bold">{customer.name.charAt(0).toUpperCase()}</Text>
      </View>
      <Text className="text-lg font-bold text-gray-900">{customer.name}</Text>
      <Text className="text-gray-400 text-sm">{customer.phone}</Text>
      <Badge label={customer.status === 'online' ? 'Online' : 'Offline'}
        className={customer.status === 'online' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'} />
    </Card>
  )
}
