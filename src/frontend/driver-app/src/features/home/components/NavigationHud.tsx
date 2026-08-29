import { Pressable } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { XStack, YStack, View, useTheme } from 'tamagui'
import { Ionicons } from '@expo/vector-icons'
import { SolidCard } from '../../../components/SolidCard'
import { AppText } from '../../../components/AppText'
import { TOP_CLEARANCE_BELOW_CHAT_BUTTON, MAP_OVERLAY_BOTTOM_CLEARANCE } from '../../../constants'
import type { RouteStep } from '../../../types'

// Goong's own maneuver vocabulary is short ("left"/"right"/"straight"/
// "uturn"/""), but this matches by substring rather than exact value so it
// also degrades sensibly if MAPS_PROVIDER=google's longer vocabulary
// ("turn-slight-left", "roundabout-right", ...) ever shows up here — never
// throws on an unrecognized value, just falls back to a plain "ahead" arrow.
function maneuverIcon(maneuver: string): keyof typeof Ionicons.glyphMap {
  const m = maneuver.toLowerCase()
  // Category checks (uturn/roundabout/merge-fork-ramp) come BEFORE the
  // generic left/right substring checks — Google's own vocabulary includes
  // compound values like "roundabout-left"/"fork-right", which contain
  // "left"/"right" too, so checking those first would always win and the
  // more specific icon below would never be reachable for them.
  if (m.includes('uturn')) return 'return-down-back'
  if (m.includes('roundabout')) return 'sync'
  if (m.includes('merge') || m.includes('fork') || m.includes('ramp')) return 'git-merge-outline'
  if (m.includes('left')) return 'arrow-back'
  if (m.includes('right')) return 'arrow-forward'
  return 'arrow-up'
}

function formatManeuverDistance(meters: number): string {
  return meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${Math.max(10, Math.round(meters / 10) * 10)} m`
}

function IconButton({
  name,
  onPress,
  color,
  label,
}: {
  name: keyof typeof Ionicons.glyphMap
  onPress: () => void
  color: string
  label: string
}) {
  const theme = useTheme()
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      style={{
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.primaryMuted.val,
      }}
    >
      <Ionicons name={name} size={18} color={color} />
    </Pressable>
  )
}

export function NavigationHud({
  loading,
  error,
  step,
  distanceToManeuverM,
  remainingKm,
  remainingMin,
  arrived,
  onExit,
  onRefresh,
}: {
  loading: boolean
  error: boolean
  step: RouteStep | null
  distanceToManeuverM: number | null
  remainingKm: number | null
  remainingMin: number | null
  arrived: boolean
  onExit: () => void
  onRefresh: () => void
}) {
  const insets = useSafeAreaInsets()
  const theme = useTheme()
  const purple = theme.primary.val
  const onPrimary = theme.textInverse.val
  return (
    <>
      <SolidCard style={{ position: 'absolute', left: 16, right: 16, top: insets.top + TOP_CLEARANCE_BELOW_CHAT_BUTTON }}>
        <XStack alignItems="center" gap="$3" paddingHorizontal="$4" paddingVertical="$3">
          <View width={44} height={44} borderRadius={22} alignItems="center" justifyContent="center" backgroundColor={purple}>
            <Ionicons
              name={arrived ? 'flag' : error ? 'warning' : maneuverIcon(step?.maneuver ?? '')}
              size={22}
              color={onPrimary}
            />
          </View>
          <YStack flex={1}>
            {loading && <AppText variant="bodyStrong">Đang tính đường...</AppText>}
            {!loading && error && (
              <AppText variant="bodyStrong">Không lấy được chỉ đường</AppText>
            )}
            {!loading && !error && arrived && (
              <AppText variant="bodyStrong">Đã đến nơi</AppText>
            )}
            {!loading && !error && !arrived && step && (
              <>
                <AppText variant="caption" color="$textSecondary">
                  {distanceToManeuverM != null ? formatManeuverDistance(distanceToManeuverM) : ''}
                </AppText>
                <AppText variant="title" numberOfLines={2}>
                  {step.instruction}
                </AppText>
              </>
            )}
          </YStack>
          <XStack gap="$2">
            {error && <IconButton name="refresh" onPress={onRefresh} color={purple} label="Tính lại đường đi" />}
            <IconButton name="close" onPress={onExit} color={purple} label="Thoát chỉ đường" />
          </XStack>
        </XStack>
      </SolidCard>

      {!loading && !error && !arrived && remainingKm != null && remainingMin != null && (
        <SolidCard style={{ position: 'absolute', left: 16, right: 16, bottom: insets.bottom + MAP_OVERLAY_BOTTOM_CLEARANCE }}>
          <XStack justifyContent="center" paddingVertical="$3">
            <AppText variant="bodyStrong">
              {remainingKm} km · {remainingMin} phút còn lại
            </AppText>
          </XStack>
        </SolidCard>
      )}
    </>
  )
}
