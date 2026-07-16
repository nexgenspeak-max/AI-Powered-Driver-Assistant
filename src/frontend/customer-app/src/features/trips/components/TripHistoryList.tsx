import { FlatList, ActivityIndicator, RefreshControl } from 'react-native'
import { View, Text, useTheme } from 'tamagui'
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
  const theme = useTheme()

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await queryClient.invalidateQueries({ queryKey: ['trip-history'] })
    setRefreshing(false)
  }, [queryClient])

  if (isLoading) {
    return (
      <View flex={1} alignItems="center" justifyContent="center" backgroundColor="$surface">
        <ActivityIndicator size="large" color="#6c8aff" />
      </View>
    )
  }

  if (isError) {
    return (
      <View flex={1} alignItems="center" justifyContent="center" backgroundColor="$surface" padding="$6">
        <Text color="$danger" fontSize="$4" fontWeight="500">
          Could not load trip history.
        </Text>
      </View>
    )
  }

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: theme.surface.val }}
      contentContainerStyle={{ padding: 20, paddingTop: 64, paddingBottom: 100, gap: 12 }}
      data={trips ?? []}
      keyExtractor={item => item.trip_id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#6c8aff']} />}
      ListHeaderComponent={
        <Text fontSize="$7" fontWeight="800" color="$textPrimary" marginBottom="$1">
          My Trips
        </Text>
      }
      ListEmptyComponent={
        <View alignItems="center" gap="$2" paddingVertical={64}>
          <Ionicons name="time-outline" size={40} color="#c3aee0" />
          <Text color="$textSecondary" fontSize="$3">
            You have no trips yet.
          </Text>
        </View>
      }
      renderItem={({ item }) => (
        <TripHistoryItem trip={item} onPress={() => router.push(`/trip/${item.trip_id}`)} />
      )}
    />
  )
}
