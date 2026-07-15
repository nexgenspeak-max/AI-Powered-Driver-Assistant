import { View, Text, FlatList, ActivityIndicator, RefreshControl } from 'react-native'
import { router } from 'expo-router'
import { useState, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { useTripHistory } from '../hooks/useTripHistory'
import { TripHistoryItem } from './TripHistoryItem'

export function TripHistoryList() {
  const { data: trips, isLoading, isError } = useTripHistory()
  const queryClient = useQueryClient()
  const [refreshing, setRefreshing] = useState(false)

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await queryClient.invalidateQueries({ queryKey: ['trip-history'] })
    setRefreshing(false)
  }, [queryClient])

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-surface">
        <ActivityIndicator size="large" color="#6c8aff" />
      </View>
    )
  }

  if (isError) {
    return (
      <View className="flex-1 items-center justify-center bg-surface p-6">
        <Text className="text-red-500 text-base font-medium">Could not load trip history.</Text>
      </View>
    )
  }

  return (
    <FlatList
      className="flex-1 bg-surface"
      contentContainerClassName="p-5 pt-16 gap-3"
      data={trips ?? []}
      keyExtractor={item => item.trip_id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#6c8aff']} />}
      ListHeaderComponent={<Text className="text-2xl font-extrabold text-gray-900 mb-1">My Trips</Text>}
      ListEmptyComponent={
        <View className="items-center gap-2 py-16">
          <Ionicons name="time-outline" size={40} color="#c3aee0" />
          <Text className="text-gray-400 text-sm">You have no trips yet.</Text>
        </View>
      }
      renderItem={({ item }) => (
        <TripHistoryItem trip={item} onPress={() => router.push(`/trip/${item.trip_id}`)} />
      )}
    />
  )
}
