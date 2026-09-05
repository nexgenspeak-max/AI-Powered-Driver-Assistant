import { XStack, YStack, View, useTheme } from 'tamagui'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { Surface } from '../../../components/Surface'
import { AppText } from '../../../components/AppText'
import { colorForTrip } from '../../home/lib/mapConstants'
import type { OptimizedRoute } from '../../../types'

function formatDistance(meters: number): string {
  return meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${Math.round(meters)} m`
}

function colorByTripId(route: OptimizedRoute): Record<string, string> {
  const seen: string[] = []
  for (const stop of route.stops) {
    if (!seen.includes(stop.trip_id)) seen.push(stop.trip_id)
  }
  return Object.fromEntries(seen.map((id, i) => [id, colorForTrip(i)]))
}

/**
 * Visiting order across active multi-stop trips — lives on Chuyến đi (Đang chạy),
 * not as a floating card on the home map.
 */
export function OptimizedRouteCard({ route }: { route: OptimizedRoute }) {
  const theme = useTheme()
  const colors = colorByTripId(route)
  const stops = route.stops

  if (stops.length < 2) return null

  return (
    <Surface clip borderRadius={24} padding="$4" gap="$3">
      <XStack alignItems="center" gap="$2">
        <MaterialCommunityIcons name="routes" size={22} color={theme.primary.val} />
        <YStack flex={1} gap="$1">
          <AppText variant="title">Lộ trình tối ưu</AppText>
          <AppText variant="caption" color="$textSecondary">
            Thứ tự {stops.length} điểm · quãng đường ngắn hơn
          </AppText>
        </YStack>
      </XStack>

      {route.source === 'haversine_fallback' ? (
        <AppText variant="caption" color="$textSecondary">
          Ước tính đường chim bay — chưa có dữ liệu giao thông thực tế
        </AppText>
      ) : null}

      <YStack gap="$3">
        {stops.map((stop, i) => (
          <XStack key={`${stop.trip_id}-${stop.kind}-${i}`} alignItems="center" gap="$3">
            <View
              width={28}
              height={28}
              borderRadius={14}
              alignItems="center"
              justifyContent="center"
              backgroundColor={colors[stop.trip_id] ?? theme.primary.val}
            >
              <AppText variant="label" color={theme.textInverse.val}>
                {i + 1}
              </AppText>
            </View>
            <YStack flex={1} gap="$1">
              <AppText variant="label" numberOfLines={1}>
                {stop.kind === 'pickup' ? 'Đón' : 'Trả'} {stop.customer_name || 'khách'}
              </AppText>
              <AppText variant="caption" color="$textSecondary" numberOfLines={2}>
                {stop.address}
              </AppText>
              <AppText variant="caption" color="$textMuted">
                {formatDistance(stop.distance_m)} · ~{stop.eta_minutes} phút
              </AppText>
            </YStack>
          </XStack>
        ))}
      </YStack>
    </Surface>
  )
}
