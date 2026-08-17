import { useState } from 'react'
import { ScrollView } from 'react-native'
import { View, XStack, YStack, Text } from 'tamagui'
import { Ionicons } from '@expo/vector-icons'
import { GlassSurface } from '../../../components/GlassSurface'
import type { OptimizedRoute } from '../../../types'

function formatDistance(meters: number): string {
  return meters >= 1000 ? `${(meters / 1000).toFixed(1)}km` : `${Math.round(meters)}m`
}

// Collapsed by default so it never blocks the map on first open — a driver
// taps it open only when they actually want to see the ordered stop list.
export function OptimizedRoutePanel({ route, colorForTripId }: {
  route: OptimizedRoute
  colorForTripId: (tripId: string) => string
}) {
  const [expanded, setExpanded] = useState(false)
  const stops = route.stops

  return (
    <GlassSurface
      cornerRadius={20}
      onPress={() => setExpanded(v => !v)}
      style={{ position: 'absolute', left: 16, right: 16, bottom: 16 }}
    >
      <XStack alignItems="center" justifyContent="space-between" paddingHorizontal="$4" paddingVertical="$3">
        <XStack alignItems="center" gap="$2" flex={1}>
          <Ionicons name="navigate" size={18} color="#8B5CF6" />
          <Text color="$textPrimary" fontWeight="600">
            Lộ trình tối ưu · {stops.length} điểm dừng
          </Text>
        </XStack>
        <Ionicons name={expanded ? 'chevron-down' : 'chevron-up'} size={18} color="#8B5CF6" />
      </XStack>

      {route.source === 'haversine_fallback' && (
        <Text color="$textSecondary" fontSize={11} paddingHorizontal="$4" paddingBottom={expanded ? 0 : '$3'}>
          Ước tính theo đường chim bay, chưa có dữ liệu giao thông thực tế
        </Text>
      )}

      {expanded && (
        <ScrollView style={{ maxHeight: 260 }} contentContainerStyle={{ paddingBottom: 12 }}>
          <YStack paddingHorizontal="$4" gap="$3">
            {stops.map((stop, i) => (
              <XStack key={`${stop.trip_id}-${stop.kind}`} alignItems="center" gap="$3">
                <View
                  width={22}
                  height={22}
                  borderRadius={11}
                  alignItems="center"
                  justifyContent="center"
                  backgroundColor={colorForTripId(stop.trip_id)}
                >
                  <Text color="#ffffff" fontSize={11} fontWeight="700">
                    {i + 1}
                  </Text>
                </View>
                <YStack flex={1}>
                  <Text color="$textPrimary" fontWeight="500" numberOfLines={1}>
                    {stop.kind === 'pickup' ? 'Đón' : 'Trả'} {stop.customer_name || 'khách'}
                  </Text>
                  <Text color="$textSecondary" fontSize={11} numberOfLines={1}>
                    {stop.address} · {formatDistance(stop.distance_m)} · {stop.eta_minutes} phút
                  </Text>
                </YStack>
              </XStack>
            ))}
          </YStack>
        </ScrollView>
      )}
    </GlassSurface>
  )
}
