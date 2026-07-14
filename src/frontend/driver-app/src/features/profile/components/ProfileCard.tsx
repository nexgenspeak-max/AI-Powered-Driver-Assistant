import { View, Text } from 'react-native'
import { Card } from '../../../components/Card'
import { Badge } from '../../../components/Badge'
import type { Driver, DriverProfile } from '../../../types'

interface Props {
  driver: Driver
  profile: DriverProfile
}

export function ProfileCard({ driver, profile }: Props) {
  return (
    <View className="gap-4">
      <Card className="items-center gap-2 py-6">
        <View className="w-16 h-16 rounded-full bg-primary items-center justify-center">
          <Text className="text-white text-2xl font-bold">{driver.name.charAt(0).toUpperCase()}</Text>
        </View>
        <Text className="text-lg font-bold text-gray-900">{driver.name}</Text>
        <Text className="text-gray-400 text-sm">{driver.phone}</Text>
        <Badge label={driver.status === 'online' ? 'Online' : 'Offline'}
          className={driver.status === 'online' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'} />
      </Card>

      {!!driver.vehicle_name && (
        <Card className="gap-2">
          <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Vehicle</Text>
          <Text className="text-gray-900 font-medium">{driver.vehicle_name}</Text>
          <Text className="text-gray-500 text-sm">{driver.vehicle_plate}</Text>
        </Card>
      )}

      <Card className="gap-3">
        <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Performance</Text>
        <View className="flex-row justify-between">
          <StatBlock label="Rating" value={profile.rating.toFixed(2)} />
          <StatBlock label="Trips" value={String(profile.total_trips)} />
        </View>
        <View className="flex-row justify-between">
          <StatBlock label="Acceptance" value={`${profile.acceptance_rate.toFixed(0)}%`} />
          <StatBlock label="Completion" value={`${profile.completion_rate.toFixed(0)}%`} />
        </View>
      </Card>
    </View>
  )
}

function StatBlock({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1 items-center">
      <Text className="text-xl font-bold text-gray-900">{value}</Text>
      <Text className="text-xs text-gray-400">{label}</Text>
    </View>
  )
}
