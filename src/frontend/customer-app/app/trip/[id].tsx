import { useLocalSearchParams } from 'expo-router'
import { View, Text, ActivityIndicator } from 'react-native'
import { TripStatusCard } from '../../src/features/trips/components/TripStatusCard'
import { useTripStatus } from '../../src/features/trips/hooks/useTripStatus'

export default function TripStatusScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { data: trip, isLoading, isError } = useTripStatus(id ?? null)

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-surface">
        <ActivityIndicator size="large" color="#6c8aff" />
      </View>
    )
  }

  if (isError || !trip) {
    return (
      <View className="flex-1 items-center justify-center bg-surface p-6">
        <Text className="text-red-500 text-base font-medium">Trip not found.</Text>
      </View>
    )
  }

  return <TripStatusCard trip={trip} />
}
