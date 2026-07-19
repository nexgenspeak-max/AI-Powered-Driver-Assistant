import { ScrollView, Switch, RefreshControl } from 'react-native'
import { View, XStack, Text, useTheme } from 'tamagui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
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
  const theme = useTheme()
  const insets = useSafeAreaInsets()

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
    <View flex={1} backgroundColor="$surface">
      <View backgroundColor="$dark" paddingHorizontal="$5" paddingTop={insets.top + 16} paddingBottom="$4">
        <XStack alignItems="center" justifyContent="space-between">
          <View>
            <Text color="$textInverse" fontWeight="700" fontSize="$5">
              {driver.name}
            </Text>
            <Text color="$textSecondary" fontSize="$1">
              {driver.phone}
            </Text>
          </View>
          <XStack alignItems="center" gap="$2">
            <Text fontSize="$1" fontWeight="500" color={isOnline ? theme.success.val : theme.textMuted.val}>
              {isOnline ? 'Online' : 'Offline'}
            </Text>
            <Switch
              value={isOnline}
              onValueChange={toggleOnline}
              trackColor={{ false: theme.borderStrong.val, true: theme.successContainer.val }}
              thumbColor={isOnline ? theme.success.val : theme.textMuted.val}
            />
          </XStack>
        </XStack>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20, paddingBottom: 100, gap: 16 }}
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
