import { YStack, XStack, Text } from 'tamagui'
import { Card } from '../../../components/Card'
import { Badge } from '../../../components/Badge'
import type { Driver, DriverProfile } from '../../../types'

interface Props {
  driver: Driver
  profile: DriverProfile
}

export function ProfileCard({ driver, profile }: Props) {
  const isOnline = driver.status === 'online'
  return (
    <YStack gap="$4">
      <Card alignItems="center" gap="$2" paddingVertical="$6">
        <YStack
          width={64}
          height={64}
          borderRadius="$pill"
          backgroundColor="$primary"
          alignItems="center"
          justifyContent="center"
        >
          <Text color="$textInverse" fontSize="$8" fontWeight="700">
            {driver.name.charAt(0).toUpperCase()}
          </Text>
        </YStack>
        <Text fontSize="$5" fontWeight="700" color="$textPrimary">
          {driver.name}
        </Text>
        <Text color="$textSecondary" fontSize="$3">
          {driver.phone}
        </Text>
        <Badge
          label={isOnline ? 'Online' : 'Offline'}
          backgroundColor={isOnline ? '$green4' : '$gray4'}
          color={isOnline ? '$green11' : '$gray11'}
        />
      </Card>

      {!!driver.vehicle_name && (
        <Card gap="$2">
          <Text fontSize="$1" fontWeight="600" color="$textSecondary" textTransform="uppercase" letterSpacing={0.5}>
            Vehicle
          </Text>
          <Text color="$textPrimary" fontWeight="500">
            {driver.vehicle_name}
          </Text>
          <Text color="$textSecondary" fontSize="$3">
            {driver.vehicle_plate}
          </Text>
        </Card>
      )}

      <Card gap="$3">
        <Text fontSize="$1" fontWeight="600" color="$textSecondary" textTransform="uppercase" letterSpacing={0.5}>
          Performance
        </Text>
        <XStack justifyContent="space-between">
          <StatBlock label="Rating" value={profile.rating.toFixed(2)} />
          <StatBlock label="Trips" value={String(profile.total_trips)} />
        </XStack>
        <XStack justifyContent="space-between">
          <StatBlock label="Acceptance" value={`${profile.acceptance_rate.toFixed(0)}%`} />
          <StatBlock label="Completion" value={`${profile.completion_rate.toFixed(0)}%`} />
        </XStack>
      </Card>
    </YStack>
  )
}

function StatBlock({ label, value }: { label: string; value: string }) {
  return (
    <YStack flex={1} alignItems="center">
      <Text fontSize="$6" fontWeight="700" color="$textPrimary">
        {value}
      </Text>
      <Text fontSize="$1" color="$textSecondary">
        {label}
      </Text>
    </YStack>
  )
}
