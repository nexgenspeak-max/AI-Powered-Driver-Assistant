import { XStack, YStack, View, useTheme } from 'tamagui'
import { Ionicons } from '@expo/vector-icons'
import { Surface } from '../../../components/Surface'
import { AppText } from '../../../components/AppText'
import { formatCurrency, formatKm, formatTime } from '../../../utils/format'
import type { Trip } from '../../../types'

export type EarningsTrip = Trip & { estimated_fare: number }

function dayHeading(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return 'Khác'
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const that = new Date(d)
  that.setHours(0, 0, 0, 0)
  const diffDays = Math.round((today.getTime() - that.getTime()) / 86400000)
  if (diffDays === 0) return 'Hôm nay'
  if (diffDays === 1) return 'Hôm qua'
  return d.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit' })
}

/** Groups (already sorted newest-first) trips by completion day, preserving order. */
export function groupTripsByDay(trips: EarningsTrip[]): { heading: string; total: number; trips: EarningsTrip[] }[] {
  const groups: { heading: string; total: number; trips: EarningsTrip[] }[] = []
  for (const t of trips) {
    const heading = dayHeading(t.updated_at || t.created_at)
    const last = groups[groups.length - 1]
    if (last && last.heading === heading) {
      last.trips.push(t)
      last.total += t.estimated_fare || 0
    } else {
      groups.push({ heading, total: t.estimated_fare || 0, trips: [t] })
    }
  }
  return groups
}

function TripRow({ trip, last }: { trip: EarningsTrip; last: boolean }) {
  const theme = useTheme()
  const when = trip.updated_at || trip.pickup_time || trip.created_at
  return (
    <XStack
      alignItems="center"
      gap="$3"
      paddingHorizontal="$4"
      paddingVertical="$3"
      borderBottomWidth={last ? 0 : 1}
      borderBottomColor="$divider"
    >
      <View width={36} height={36} borderRadius={18} backgroundColor="$successContainer" alignItems="center" justifyContent="center">
        <Ionicons name="checkmark" size={18} color={theme.onSuccessContainer.val} />
      </View>
      <YStack flex={1} minWidth={0} gap={2}>
        <AppText variant="bodyStrong" numberOfLines={1}>
          {trip.customer_name || 'Khách'}
        </AppText>
        <AppText variant="caption" color="$textSecondary" numberOfLines={1}>
          {formatTime(when)}
          {trip.distance_km ? ` · ${formatKm(trip.distance_km)}` : ''}
          {' · '}
          {trip.dropoff_address}
        </AppText>
      </YStack>
      <AppText variant="title">{formatCurrency(trip.estimated_fare)}</AppText>
    </XStack>
  )
}

// Statement-style list: one card per day with the day's total in the
// header, compact rows inside. Reads like a wallet history instead of a
// stack of full trip cards.
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
        <AppText variant="h2">Lịch sử</AppText>
        <AppText variant="body" color="$textSecondary">
          {emptyMessage}
        </AppText>
      </YStack>
    )
  }

  const groups = groupTripsByDay(trips)

  return (
    <YStack gap="$3">
      <XStack justifyContent="space-between" alignItems="baseline">
        <AppText variant="h2">Lịch sử</AppText>
        <AppText variant="caption" color="$textSecondary">
          {truncationNote ?? `${trips.length} chuyến`}
        </AppText>
      </XStack>
      {groups.map(group => (
        <Surface key={group.heading} clip borderRadius={24}>
          <XStack justifyContent="space-between" alignItems="center" paddingHorizontal="$4" paddingTop="$3" paddingBottom="$2">
            <AppText variant="label" color="$textSecondary">
              {group.heading}
            </AppText>
            <AppText variant="label">{formatCurrency(group.total)}</AppText>
          </XStack>
          {group.trips.map((trip, i) => (
            <TripRow key={trip.trip_id} trip={trip} last={i === group.trips.length - 1} />
          ))}
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
    .filter(t => {
      const completedAt = new Date(t.updated_at || t.created_at).getTime()
      return !Number.isNaN(completedAt) && completedAt >= fromMs
    })
    .sort((a, b) => (b.updated_at || b.created_at).localeCompare(a.updated_at || a.created_at))
}

/** Case-insensitive match on customer name or pickup/dropoff address. */
export function filterTripsByQuery(trips: EarningsTrip[], query: string): EarningsTrip[] {
  const q = query.trim().toLowerCase()
  if (!q) return trips
  return trips.filter(t => {
    const haystack = [t.customer_name, t.pickup_address, t.dropoff_address].filter(Boolean).join(' ').toLowerCase()
    return haystack.includes(q)
  })
}
