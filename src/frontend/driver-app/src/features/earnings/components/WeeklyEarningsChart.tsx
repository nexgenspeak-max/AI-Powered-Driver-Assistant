import { XStack, YStack, View } from 'tamagui'
import { AppText } from '../../../components/AppText'
import { formatCurrency } from '../../../utils/format'
import type { EarningsTrip } from './CompletedTripEarningsList'

const DAY_LABELS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']
const BAR_MAX_HEIGHT = 88

export type DayBucket = { key: string; label: string; total: number; isToday: boolean }

/** Last 7 calendar days (oldest → today), summing each trip's fare by completion day. */
export function bucketLastSevenDays(trips: EarningsTrip[], now = new Date()): DayBucket[] {
  const days: DayBucket[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now)
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() - i)
    days.push({ key: d.toDateString(), label: DAY_LABELS[d.getDay()], total: 0, isToday: i === 0 })
  }
  const byKey = new Map(days.map(d => [d.key, d]))
  for (const t of trips) {
    const when = new Date(t.updated_at || t.created_at)
    if (Number.isNaN(when.getTime())) continue
    when.setHours(0, 0, 0, 0)
    const bucket = byKey.get(when.toDateString())
    if (bucket) bucket.total += t.estimated_fare || 0
  }
  return days
}

// Plain-View bar chart (no chart library): seven bars, today in brand
// violet, the rest muted. Big enough to read at a glance, nothing to tap.
export function WeeklyEarningsChart({ trips, currency = 'VND' }: { trips: EarningsTrip[]; currency?: string }) {
  const days = bucketLastSevenDays(trips)
  const max = Math.max(1, ...days.map(d => d.total))
  const best = days.reduce((a, b) => (b.total > a.total ? b : a), days[0])

  return (
    <YStack gap="$3">
      <XStack justifyContent="space-between" alignItems="baseline">
        <AppText variant="h2">7 ngày qua</AppText>
        {best.total > 0 ? (
          <AppText variant="caption" color="$textSecondary">
            Cao nhất {best.label}: {formatCurrency(best.total, currency)}
          </AppText>
        ) : null}
      </XStack>
      <XStack alignItems="flex-end" justifyContent="space-between" height={BAR_MAX_HEIGHT + 28} gap="$2">
        {days.map(d => {
          const h = d.total > 0 ? Math.max(6, Math.round((d.total / max) * BAR_MAX_HEIGHT)) : 4
          return (
            <YStack key={d.key} flex={1} alignItems="center" gap="$2">
              <View
                width="100%"
                maxWidth={28}
                height={h}
                borderRadius={8}
                backgroundColor={d.isToday ? '$primary' : d.total > 0 ? '$primaryContainer' : '$chip'}
                accessibilityLabel={`${d.label}: ${formatCurrency(d.total, currency)}`}
              />
              <AppText variant="caption" color={d.isToday ? '$primary' : '$textMuted'}>
                {d.label}
              </AppText>
            </YStack>
          )
        })}
      </XStack>
    </YStack>
  )
}
