import { View, Text, ScrollView, Switch } from 'react-native'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { TripCard } from '../src/features/trips/components/TripCard'
import { useAssignedTrips } from '../src/features/trips/hooks/useAssignedTrips'
import { useAuthStore } from '../src/stores/authStore'
import { driversService } from '../src/services/api'

export default function DashboardScreen() {
  const driver    = useAuthStore(s => s.driver)!
  const setDriver = useAuthStore(s => s.setDriver)
  const logout    = useAuthStore(s => s.logout)
  const qc        = useQueryClient()

  const { data: notified = [] } = useAssignedTrips(driver.phone, 'notified')
  const { data: calling  = [] } = useAssignedTrips(driver.phone, 'calling')
  const { data: active   = [] } = useAssignedTrips(driver.phone, 'confirmed')

  const pending = [...notified, ...calling]

  const { mutate: toggleOnline } = useMutation({
    mutationFn: (online: boolean) =>
      driversService.update(driver.phone, { status: online ? 'online' : 'offline' }),
    onSuccess: d => { setDriver(d); qc.invalidateQueries({ queryKey: ['trips', 'driver'] }) },
  })

  const isOnline = driver.status === 'online'

  return (
    <View className="flex-1 bg-surface">
      {/* Header */}
      <View className="bg-dark px-5 pt-14 pb-4">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <View className="w-9 h-9 rounded-full bg-primary items-center justify-center">
              <Text className="text-white font-bold">{driver.name.charAt(0).toUpperCase()}</Text>
            </View>
            <View>
              <Text className="text-white font-bold">{driver.name}</Text>
              <Text className="text-gray-400 text-xs">{driver.phone}</Text>
            </View>
          </View>
          <View className="flex-row items-center gap-2">
            <Text className="text-xs font-medium" style={{ color: isOnline ? '#4ade80' : '#9ca3af' }}>
              {isOnline ? 'Online' : 'Offline'}
            </Text>
            <Switch
              value={isOnline}
              onValueChange={toggleOnline}
              trackColor={{ false: '#374151', true: '#166534' }}
              thumbColor={isOnline ? '#4ade80' : '#6b7280'}
            />
            <Text className="text-gray-400 text-xs ml-2" onPress={logout}>Logout</Text>
          </View>
        </View>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="p-4 gap-4">
        {/* Trip requests */}
        {pending.length > 0 && (
          <View className="gap-3">
            <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Trip requests ({pending.length})
            </Text>
            {pending.map(trip => <TripCard key={trip.trip_id} trip={trip} />)}
          </View>
        )}

        {/* Active trip */}
        {active.length > 0 && (
          <View className="gap-3">
            <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Active trip
            </Text>
            {active.map(trip => <TripCard key={trip.trip_id} trip={trip} />)}
          </View>
        )}

        {/* Empty state */}
        {pending.length === 0 && active.length === 0 && (
          <View className="flex-1 items-center justify-center py-20">
            <Text className="text-5xl mb-3">✅</Text>
            <Text className="font-bold text-gray-600 text-base">
              {isOnline ? 'No trips right now' : 'You are offline'}
            </Text>
            <Text className="text-sm text-gray-400 mt-1 text-center">
              {isOnline
                ? 'Waiting for new assignments...'
                : 'Toggle Online to start receiving trips'}
            </Text>
          </View>
        )}

        <Text className="text-center text-xs text-gray-400">Auto-refreshes every 4s</Text>
      </ScrollView>
    </View>
  )
}
