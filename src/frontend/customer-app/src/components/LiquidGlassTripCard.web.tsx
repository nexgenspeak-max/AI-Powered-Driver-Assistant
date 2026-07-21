import type { ReactNode } from 'react'
import { TouchableOpacity } from 'react-native'
import { Text, XStack, YStack, View } from 'tamagui'
import { Ionicons } from '@expo/vector-icons'
import { Card } from './Card'
import { Badge } from './Badge'
import { GlassSheen } from './LiquidGlass'
import { TRIP_STATUS_LABELS, TRIP_STATUS_COLORS } from '../constants/status'
import type { TripStatus } from '../types'

export interface LiquidGlassTripCardProps {
  fromLocation: string
  toLocation: string
  time: string
  phone: string
  status: TripStatus
  onPress?: () => void
  children?: ReactNode
}

// Web fallback — `@shopify/react-native-skia` needs its own CanvasKit/WASM
// setup to run on web (not automatic with Expo Router web builds, see
// AssistantAvatar.web.tsx for the same tradeoff), so the SkSL refraction/
// chromatic-aberration/specular shader in LiquidGlassTripCard.tsx doesn't
// run here. This reuses the app's existing BlurView-based glass material
// (GlassSheen/Card) instead, for the same layout without the real shader.
export function LiquidGlassTripCard({
  fromLocation,
  toLocation,
  time,
  phone,
  status,
  onPress,
  children,
}: LiquidGlassTripCardProps) {
  const statusColor = TRIP_STATUS_COLORS[status]

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={onPress ? 0.75 : 1} disabled={!onPress} style={{ borderRadius: 24, overflow: 'hidden' }}>
      <Card padding="$3">
        <XStack alignItems="center" gap="$3">
          <View width={44} height={44} borderRadius={22} overflow="hidden" backgroundColor="rgba(22,101,52,0.9)" alignItems="center" justifyContent="center">
            <GlassSheen borderRadius={22} withBorder={false} intensity="strong" />
            <Ionicons name="car" size={20} color="#ffffff" />
          </View>
          <YStack flex={1} gap="$1">
            <Text color="$textPrimary" fontSize="$3" fontWeight="700" numberOfLines={1}>
              {fromLocation} → {toLocation}
            </Text>
            <Text color="$textSecondary" fontSize={12} numberOfLines={1}>
              {time} · {phone}
            </Text>
          </YStack>
          <Badge label={TRIP_STATUS_LABELS[status]} backgroundColor={statusColor.bg} color={statusColor.text} />
        </XStack>
        {children}
      </Card>
    </TouchableOpacity>
  )
}
