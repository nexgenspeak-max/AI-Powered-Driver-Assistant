import { View, Text } from 'tamagui'
import { Card } from '../../../components/Card'
import { Badge } from '../../../components/Badge'
import type { Customer } from '../../../types'

interface Props {
  customer: Customer
}

export function ProfileCard({ customer }: Props) {
  return (
    <Card alignItems="center" gap="$2" paddingVertical="$6">
      <View width={64} height={64} borderRadius={32} backgroundColor="$primary" alignItems="center" justifyContent="center">
        <Text color="$textInverse" fontSize="$7" fontWeight="700">
          {customer.name.charAt(0).toUpperCase()}
        </Text>
      </View>
      <Text fontSize="$5" fontWeight="700" color="$textPrimary">
        {customer.name}
      </Text>
      <Text color="$textSecondary" fontSize="$3">
        {customer.phone}
      </Text>
      <Badge
        label={customer.status === 'online' ? 'Online' : 'Offline'}
        backgroundColor={customer.status === 'online' ? '$green4' : '#f3f4f6'}
        color={customer.status === 'online' ? '$green11' : '#4b5563'}
      />
    </Card>
  )
}
