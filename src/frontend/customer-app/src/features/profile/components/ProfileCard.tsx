import { YStack, XStack, View, Text } from 'tamagui'
import { Ionicons } from '@expo/vector-icons'
import { Card } from '../../../components/Card'
import { Badge } from '../../../components/Badge'
import type { Customer } from '../../../types'

interface Props {
  customer: Customer
}

// Telegram/Nicegram-style profile: big centered avatar + name, then a
// grouped "settings list" row for the phone number.
export function ProfileCard({ customer }: Props) {
  const isOnline = customer.status === 'online'

  return (
    <YStack gap="$4">
      <YStack alignItems="center" gap="$2" paddingVertical="$4">
        <View width={96} height={96} borderRadius={48} backgroundColor="$primary" alignItems="center" justifyContent="center">
          <Text color="$textInverse" fontSize={36} fontWeight="700">
            {customer.name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text fontSize="$6" fontWeight="700" color="$textPrimary" marginTop="$2">
          {customer.name}
        </Text>
        {/* Plain wrapper neutralizes Badge's own `alignSelf: flex-start`
            (meant for inline row usage elsewhere) so it centers here instead
            of sticking to the left edge under the centered name. */}
        <View>
          <Badge
            label={isOnline ? 'ONLINE' : 'OFFLINE'}
            backgroundColor={isOnline ? '$successContainer' : '$primaryMuted'}
            color={isOnline ? '$onSuccessContainer' : '$textPrimary'}
            icon={<Ionicons name="ellipse" size={7} color={isOnline ? '#34d399' : '#7C5B9C'} />}
          />
        </View>
      </YStack>

      <Card padding={0} overflow="hidden">
        <XStack alignItems="center" gap="$3" paddingHorizontal="$4" paddingVertical="$4">
          <View width={34} height={34} borderRadius={17} backgroundColor="$primaryMuted" alignItems="center" justifyContent="center">
            <Ionicons name="call-outline" size={16} color="#7C5B9C" />
          </View>
          <YStack flex={1}>
            <Text color="$textSecondary" fontSize={11}>
              Số điện thoại
            </Text>
            <Text color="$textPrimary" fontSize="$3" fontWeight="500">
              {customer.phone}
            </Text>
          </YStack>
        </XStack>
      </Card>
    </YStack>
  )
}
