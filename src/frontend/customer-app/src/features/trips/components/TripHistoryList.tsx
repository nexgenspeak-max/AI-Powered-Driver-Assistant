import { FlatList, RefreshControl } from 'react-native'
import { View, YStack } from 'tamagui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useState, useCallback, useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from 'tamagui'
import { useTripHistory } from '../hooks/useTripHistory'
import { TripHistoryItem } from './TripHistoryItem'
import { AppText } from '../../../components/AppText'
import { Skeleton } from '../../../components/Skeleton'
import { SegmentedControl } from '../../../components/SegmentedControl'
import { PENDING_STATUSES, IN_PROGRESS_STATUSES } from '../../../constants/status'
import type { Trip } from '../../../types'

type TripStatusTab = 'pending' | 'active' | 'completed'

const EMPTY_COPY: Record<TripStatusTab, string> = {
  pending: 'Không có chuyến nào đang chờ xác nhận.',
  active: 'Không có chuyến nào đang chạy.',
  completed: 'Chưa có chuyến nào hoàn thành.',
}

export function TripHistoryList() {
  const { data: trips, isLoading, isError } = useTripHistory()
  const queryClient = useQueryClient()
  const theme = useTheme()
  const [refreshing, setRefreshing] = useState(false)
  const [tab, setTab] = useState<TripStatusTab>('active')
  const insets = useSafeAreaInsets()

  // Trip status → tab, matching driver-app's own Dashboard split (kept in
  // sync across both apps): chưa xác nhận → đang chạy → đã hoàn thành.
  // Cancelled/rejected/no_answer/no_show trips intentionally sit outside all
  // 3 tabs — same scope decision as the driver side.
  const grouped = useMemo(() => {
    const all = trips ?? []
    return {
      pending: all.filter(t => (PENDING_STATUSES as string[]).includes(t.status)),
      active: all.filter(t => (IN_PROGRESS_STATUSES as string[]).includes(t.status)),
      completed: all.filter(t => t.status === 'completed'),
    }
  }, [trips])

  const visibleTrips: Trip[] = grouped[tab]

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await queryClient.invalidateQueries({ queryKey: ['trip-history'] })
    setRefreshing(false)
  }, [queryClient])

  if (isLoading) {
    return (
      <View flex={1} backgroundColor="$background" style={{ padding: 20, paddingTop: insets.top + 16, gap: 16 }}>
        <AppText variant="h1" marginBottom="$1">
          Chuyến của tôi
        </AppText>
        <Skeleton height={110} radius={24} />
        <Skeleton height={110} radius={24} />
        <Skeleton height={110} radius={24} />
      </View>
    )
  }

  if (isError) {
    return (
      <View flex={1} backgroundColor="$background" alignItems="center" justifyContent="center" padding="$6">
        <AppText variant="title" color="$danger">
          Không tải được lịch sử chuyến.
        </AppText>
      </View>
    )
  }

  return (
    <View flex={1} backgroundColor="$background">
      <FlatList
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20, paddingTop: insets.top + 16, paddingBottom: 104, gap: 16 }}
        data={visibleTrips}
        keyExtractor={item => item.trip_id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.primary.val]}
            tintColor={theme.primary.val}
          />
        }
        ListHeaderComponent={
          <YStack gap="$3" marginBottom="$2">
            <AppText variant="h1">Chuyến của tôi</AppText>
            {/* Short labels, no icons — 3 segments is already tight; an icon
                + "Chưa xác nhận (12)" wrapped to 2 lines inside the
                control's fixed height and visually overlapped the
                neighboring segment. */}
            <SegmentedControl<TripStatusTab>
              value={tab}
              onChange={setTab}
              options={[
                { value: 'pending', label: `Chờ xác nhận (${grouped.pending.length})` },
                { value: 'active', label: `Đang chạy (${grouped.active.length})` },
                { value: 'completed', label: `Hoàn thành (${grouped.completed.length})` },
              ]}
            />
          </YStack>
        }
        ListEmptyComponent={
          <YStack alignItems="center" gap="$2" paddingVertical="$10">
            <Ionicons name="time-outline" size={40} color={theme.textMuted.val} />
            <AppText variant="body" color="$textSecondary">
              {trips && trips.length > 0 ? EMPTY_COPY[tab] : 'Bạn chưa có chuyến nào.'}
            </AppText>
          </YStack>
        }
        renderItem={({ item }) => (
          <TripHistoryItem trip={item} onPress={() => router.push(`/trip/${item.trip_id}`)} />
        )}
      />
    </View>
  )
}
