import { XStack, YStack } from 'tamagui'
import { Surface } from '../../../components/Surface'
import { AppText } from '../../../components/AppText'
import { RouteLine } from '../../../components/RouteLine'
import { formatCurrency, formatDate } from '../../../utils/format'
import type { Trip } from '../../../types'

export type EarningsTrip = Trip & { estimated_fare: number }

export function CompletedTripEarningsList({
  trips,
  truncationNote,
  emptyMessage = 'Chưa có chuyến hoàn thành trong khoảng thời gian này.',
}: {
  trips: EarningsTrip[]
  truncationNote?: string
  emptyMessage?: string
}) {
  if (trips.length === 0) {
    return (
      <YStack gap="$2">
        <AppText variant="h2">Chi tiết chuyến</AppText>
        <AppText variant="body" color="$textSecondary">
          {emptyMessage}
        </AppText>
      </YStack>
    )
  }

  return (
    <YStack gap="$3">
      <AppText variant="h2">Chi tiết chuyến</AppText>
      <AppText variant="caption" color="$textSecondary">
        {truncationNote ?? `${trips.length} chuyến · số tiền theo cước từng chuyến`}
      </AppText>
      {trips.map((trip) => (
        <Surface key={trip.trip_id} clip borderRadius={24} padding="$4" gap="$3">
          <XStack alignItems="flex-start" justifyContent="space-between" gap="$3">
            <YStack flex={1} gap="$1" minWidth={0}>
              <AppText variant="bodyStrong" numberOfLines={1}>
                {trip.customer_name || 'Khách'}
              </AppText>
              <AppText variant="caption" color="$textMuted">
                {formatDate(trip.updated_at || trip.pickup_time || trip.created_at)}
                {trip.distance_km ? ` · ${trip.distance_km.toFixed(1)} km` : ''}
              </AppText>
            </YStack>
            <AppText variant="title" color="$primary">
              {formatCurrency(trip.estimated_fare)}
            </AppText>
          </XStack>
          <RouteLine pickup={trip.pickup_address} dropoff={trip.dropoff_address} />
        </Surface>
      ))}
    </YStack>
  )
}

/** Bucket by completion time (`updated_at`), matching earningsService. */
export function filterCompletedTripsForPeriod(
  trips: EarningsTrip[],
  period: 'today' | 'week' | 'month',
): EarningsTrip[] {
  const now = Date.now()
  let fromMs: number
  if (period === 'today') {
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    fromMs = start.getTime()
  } else if (period === 'month') {
    fromMs = now - 30 * 86400000
  } else {
    fromMs = now - 7 * 86400000
  }

  return trips
    .filter((t) => {
      const completedAt = new Date(t.updated_at || t.created_at).getTime()
      return !Number.isNaN(completedAt) && completedAt >= fromMs
    })
    .sort((a, b) =>
      (b.updated_at || b.created_at).localeCompare(a.updated_at || a.created_at),
    )
}

/** Case-insensitive match on customer name or pickup/dropoff address. */
export function filterTripsByQuery(trips: EarningsTrip[], query: string): EarningsTrip[] {
  const q = query.trim().toLowerCase()
  if (!q) return trips
  return trips.filter((t) => {
    const haystack = [t.customer_name, t.pickup_address, t.dropoff_address]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    return haystack.includes(q)
  })
}
