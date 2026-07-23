import { FlatList, ActivityIndicator, RefreshControl, StyleSheet } from 'react-native'
import { View, Text, useThemeName } from 'tamagui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useState, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { useTripHistory } from '../hooks/useTripHistory'
import { TripHistoryItem } from './TripHistoryItem'

// Literal per-screen background — deliberately not the shared `$surface`
// token (#1A1420 dark / #f4f6fb light). This screen's glass cards
// (GlassTripCard) were tuned against this exact pair, picked off the
// reference mockup, so it stays hardcoded here rather than following any
// future global theme retune. Light is a gradient per the Shutterstock
// reference (#F4F4F6 -> #E2E2E6), dark stays the flat original.
const SCREEN_BACKGROUND_DARK = '#15111F'
const SCREEN_BACKGROUND_LIGHT_GRADIENT = ['#F4F4F6', '#E2E2E6'] as const

export function TripHistoryList() {
  const { data: trips, isLoading, isError } = useTripHistory()
  const queryClient = useQueryClient()
  const [refreshing, setRefreshing] = useState(false)
  const isLight = useThemeName() === 'light'
  const insets = useSafeAreaInsets()

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await queryClient.invalidateQueries({ queryKey: ['trip-history'] })
    setRefreshing(false)
  }, [queryClient])

  // Screen background as its own layer (not FlatList's own backgroundColor,
  // which can only be a flat color) — a gradient in light mode, a flat
  // color in dark, with content rendered transparent on top.
  const screenBackground = isLight ? (
    <LinearGradient colors={SCREEN_BACKGROUND_LIGHT_GRADIENT} style={StyleSheet.absoluteFillObject} />
  ) : (
    <View style={[StyleSheet.absoluteFillObject, { backgroundColor: SCREEN_BACKGROUND_DARK }]} />
  )

  if (isLoading) {
    return (
      <View flex={1} alignItems="center" justifyContent="center">
        {screenBackground}
        <ActivityIndicator size="large" color="#6c8aff" />
      </View>
    )
  }

  if (isError) {
    return (
      <View flex={1} alignItems="center" justifyContent="center" padding="$6">
        {screenBackground}
        <Text color="$danger" fontSize="$4" fontWeight="500">
          Could not load trip history.
        </Text>
      </View>
    )
  }

  return (
    <View flex={1}>
      {screenBackground}
      <FlatList
        style={{ flex: 1, backgroundColor: 'transparent' }}
        contentContainerStyle={{ padding: 20, paddingTop: insets.top + 16, paddingBottom: 100, gap: 20 }}
        data={trips ?? []}
        keyExtractor={item => item.trip_id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#6c8aff']} />}
        ListHeaderComponent={
          <Text fontSize="$7" fontWeight="800" color="$textPrimary" marginBottom="$1">
            My Trips
          </Text>
        }
        ListEmptyComponent={
          <View alignItems="center" gap="$2" paddingVertical="$10">
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
    </View>
  )
}
