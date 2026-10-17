import { Pressable } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { XStack, YStack, View, useTheme } from 'tamagui'
import { Ionicons } from '@expo/vector-icons'
import { SolidCard } from '../../../components/SolidCard'
import { AppText } from '../../../components/AppText'
import { TOP_OVERLAY_CLEARANCE } from '../../../constants'
import { formatKm, formatMinutes } from '../../../utils/format'
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

/** Short Vietnamese action for the next maneuver (paired with distance in the HUD). */
function maneuverAction(maneuver: string): string {
  const m = maneuver.toLowerCase()
  if (m.includes('uturn')) return 'Quay đầu'
  if (m.includes('roundabout')) return 'Vào vòng xuyến'
  if (m.includes('merge') || m.includes('fork') || m.includes('ramp')) return 'Nhập làn'
  if (m.includes('left')) return 'Rẽ trái'
  if (m.includes('right')) return 'Rẽ phải'
  if (m.includes('straight') || m.includes('continue')) return 'Đi thẳng'
  return 'Tiếp tục'
}

/** e.g. "Rẽ trái trong 200 m", "Đi thẳng 200 m" */
function formatNextAction(maneuver: string, meters: number | null): string {
  const action = maneuverAction(maneuver)
  if (meters == null) return action
  const dist = formatManeuverDistance(meters)
  if (action === 'Đi thẳng' || action === 'Tiếp tục') return `${action} ${dist}`
  return `${action} trong ${dist}`
}

function formatRemaining(km: number, min: number): string {
  return `${formatKm(km)} · ${formatMinutes(min)}`
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

/**
 * Single top HUD while navigating: next turn + remaining trip in one card.
 * No bottom ETA strip — drivers should not split attention top/bottom.
 */
export function NavigationHud({
  loading,
  error,
  step,
  distanceToManeuverM,
  remainingKm,
  remainingMin,
  arrived,
  rerouting = false,
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
  /** Automatic off-route re-fetch in flight — previous steps stay on screen. */
  rerouting?: boolean
  onExit: () => void
  onRefresh: () => void
}) {
  const insets = useSafeAreaInsets()
  const theme = useTheme()
  const purple = theme.primary.val
  const onPrimary = theme.textInverse.val

  const remainingLabel =
    !loading && !error && !arrived && remainingKm != null && remainingMin != null
      ? formatRemaining(remainingKm, remainingMin)
      : null

  return (
    <SolidCard style={{ position: 'absolute', left: 16, right: 16, top: insets.top + TOP_OVERLAY_CLEARANCE }}>
      <XStack alignItems="center" gap="$3" paddingHorizontal="$4" paddingVertical="$3">
        <View width={44} height={44} borderRadius={22} alignItems="center" justifyContent="center" backgroundColor={purple}>
          <Ionicons
            name={arrived ? 'flag' : error ? 'warning' : maneuverIcon(step?.maneuver ?? '')}
            size={22}
            color={onPrimary}
          />
        </View>
        <YStack flex={1} gap="$1">
          {loading && <AppText variant="bodyStrong">Đang tính đường...</AppText>}
          {!loading && error && (
            <AppText variant="bodyStrong">Không lấy được chỉ đường</AppText>
          )}
          {!loading && !error && arrived && (
            <AppText variant="bodyStrong">Đã đến nơi</AppText>
          )}
          {!loading && !error && !arrived && step && (
            <>
              <AppText variant="title" numberOfLines={2}>
                {formatNextAction(step.maneuver, distanceToManeuverM)}
              </AppText>
              {rerouting ? (
                <AppText variant="caption" color="$primary">
                  Đang tính lại đường...
                </AppText>
              ) : remainingLabel ? (
                <AppText variant="caption" color="$textSecondary">
                  Còn {remainingLabel}
                </AppText>
              ) : null}
              {step.instruction ? (
                <AppText variant="caption" color="$textMuted" numberOfLines={1}>
                  {step.instruction}
                </AppText>
              ) : null}
            </>
          )}
          {!loading && !error && !arrived && !step && remainingLabel && (
            <AppText variant="bodyStrong">Còn {remainingLabel}</AppText>
          )}
        </YStack>
        <XStack gap="$2">
          {error && <IconButton name="refresh" onPress={onRefresh} color={purple} label="Tính lại đường đi" />}
          <IconButton name="close" onPress={onExit} color={purple} label="Thoát chỉ đường" />
        </XStack>
      </XStack>
    </SolidCard>
  )
}
