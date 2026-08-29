import { useState } from 'react'
import { Pressable, ScrollView } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { View, XStack, YStack, useTheme } from 'tamagui'
import { Ionicons } from '@expo/vector-icons'
import { SolidCard } from '../../../components/SolidCard'
import { AppText } from '../../../components/AppText'
import { MAP_OVERLAY_BOTTOM_CLEARANCE } from '../../../constants'
import type { OptimizedRoute } from '../../../types'

function formatDistance(meters: number): string {
  return meters >= 1000 ? `${(meters / 1000).toFixed(1)}km` : `${Math.round(meters)}m`
}

export function OptimizedRoutePanel({ route, colorForTripId }: {
  route: OptimizedRoute
  colorForTripId: (tripId: string) => string
}) {
  const [expanded, setExpanded] = useState(false)
  const stops = route.stops
  const insets = useSafeAreaInsets()
  const theme = useTheme()

  return (
    <SolidCard
      cornerRadius={20}
      style={{ position: 'absolute', left: 16, right: 16, bottom: insets.bottom + MAP_OVERLAY_BOTTOM_CLEARANCE }}
    >
      <Pressable
        onPress={() => setExpanded(v => !v)}
        accessibilityRole="button"
        accessibilityLabel={`Lộ trình tối ưu, ${stops.length} điểm dừng`}
        accessibilityState={{ expanded }}
        style={{ minHeight: 44 }}
      >
        <XStack alignItems="center" justifyContent="space-between" paddingHorizontal="$4" paddingVertical="$3">
          <XStack alignItems="center" gap="$2" flex={1}>
            <Ionicons name="navigate" size={18} color={theme.primary.val} />
            <AppText variant="title" flex={1}>
              Lộ trình tối ưu · {stops.length} điểm dừng
            </AppText>
          </XStack>
          <Ionicons name={expanded ? 'chevron-down' : 'chevron-up'} size={18} color={theme.primary.val} />
        </XStack>
      </Pressable>

      {route.source === 'haversine_fallback' && (
        <AppText variant="caption" color="$textSecondary" paddingHorizontal="$4" paddingBottom={expanded ? 0 : '$3'}>
          Ước tính theo đường chim bay, chưa có dữ liệu giao thông thực tế
        </AppText>
      )}

      {expanded && (
        <ScrollView
          style={{ maxHeight: 260 }}
          contentContainerStyle={{ paddingBottom: 12 }}
          showsVerticalScrollIndicator
          persistentScrollbar
        >
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
                  <AppText variant="caption" color={theme.textInverse.val}>
                    {i + 1}
                  </AppText>
                </View>
                <YStack flex={1}>
                  <AppText variant="label" numberOfLines={1}>
                    {stop.kind === 'pickup' ? 'Đón' : 'Trả'} {stop.customer_name || 'khách'}
                  </AppText>
                  <AppText variant="caption" color="$textSecondary" numberOfLines={1}>
                    {stop.address} · {formatDistance(stop.distance_m)} · {stop.eta_minutes} phút
                  </AppText>
                </YStack>
              </XStack>
            ))}
          </YStack>
        </ScrollView>
      )}
    </SolidCard>
  )
}
