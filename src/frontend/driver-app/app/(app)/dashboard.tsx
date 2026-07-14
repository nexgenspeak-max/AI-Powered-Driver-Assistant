import { View, Text, ScrollView, Switch, RefreshControl } from 'react-native'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useDriverContext } from '../../src/features/dashboard/hooks/useDriverContext'
import { TripSection } from '../../src/features/dashboard/components/TripSection'
import { EmptyTripsState } from '../../src/features/dashboard/components/EmptyTripsState'
import { driversService } from '../../src/services/api/drivers'
import { useAuthStore } from '../../src/stores/authStore'
import { PENDING_STATUSES, ACTIVE_STATUSES } from '../../src/constants/status'

export default function DashboardScreen() {
  const driver = useAuthStore(s => s.driver)!
  const setDriver = useAuthStore(s => s.setDriver)
  const qc = useQueryClient()

  const { data: context, isLoading, isRefetching, refetch } = useDriverContext()

  const { mutate: toggleOnline } = useMutation({
    mutationFn: (online: boolean) => driversService.update(driver.phone, { status: online ? 'online' : 'offline' }),
    onSuccess: d => { setDriver(d); qc.invalidateQueries({ queryKey: ['driverContext'] }) },
  })

  const isOnline = driver.status === 'online'
  const pending = context?.upcoming_trips.filter(t => PENDING_STATUSES.includes(t.status)) ?? []
  const active = [
    ...(context?.current_trip && ACTIVE_STATUSES.includes(context.current_trip.status) ? [context.current_trip] : []),
    ...context?.upcoming_trips.filter(t => ACTIVE_STATUSES.includes(t.status) && t.trip_id !== context.current_trip?.trip_id) ?? [],
  ]

  return (
    <View className="flex-1 bg-surface">
      <View className="bg-dark px-5 pt-14 pb-4">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-white font-bold text-lg">{driver.name}</Text>
            <Text className="text-gray-400 text-xs">{driver.phone}</Text>
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
          </View>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="p-4 gap-4"
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      >
        {!isLoading && (
          <>
            <TripSection title={`Trip Requests (${pending.length})`} trips={pending} />
            <TripSection title="Active Trip" trips={active} />
            {pending.length === 0 && active.length === 0 && <EmptyTripsState isOnline={isOnline} />}
          </>
        )}
      </ScrollView>
    </View>
  )
}
