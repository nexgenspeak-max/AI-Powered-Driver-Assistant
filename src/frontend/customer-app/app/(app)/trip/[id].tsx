import { useLocalSearchParams } from 'expo-router'
import { ActivityIndicator } from 'react-native'
import { View, Text } from 'tamagui'
import { TripStatusCard } from '../../../src/features/trips/components/TripStatusCard'
import { useTripStatus } from '../../../src/features/trips/hooks/useTripStatus'

export default function TripStatusScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { data: trip, isLoading, isError } = useTripStatus(id ?? null)

  if (isLoading) {
    return (
      <View flex={1} alignItems="center" justifyContent="center" backgroundColor="$surface">
        <ActivityIndicator size="large" color="#6c8aff" />
      </View>
    )
  }

  if (isError || !trip) {
    return (
      <View flex={1} alignItems="center" justifyContent="center" backgroundColor="$surface" padding="$6">
        <Text color="$danger" fontSize="$4" fontWeight="500">
          Trip not found.
        </Text>
      </View>
    )
  }

  return <TripStatusCard trip={trip} />
}
