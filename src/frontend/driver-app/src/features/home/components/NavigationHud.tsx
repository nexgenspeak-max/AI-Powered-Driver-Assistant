import { Pressable } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { XStack, YStack, Text, View } from 'tamagui'
import { Ionicons } from '@expo/vector-icons'
import { SolidCard } from '../../../components/SolidCard'
import { TOP_CLEARANCE_BELOW_CHAT_BUTTON, MAP_OVERLAY_BOTTOM_CLEARANCE } from '../../../constants'
import type { RouteStep } from '../../../types'

const PURPLE = '#8B5CF6'

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

function IconButton({ name, onPress }: { name: keyof typeof Ionicons.glyphMap; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={{ width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(139,92,246,0.12)' }}
    >
      <Ionicons name={name} size={16} color={PURPLE} />
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
  return (
    <>
      <SolidCard style={{ position: 'absolute', left: 16, right: 16, top: insets.top + TOP_CLEARANCE_BELOW_CHAT_BUTTON }}>
        <XStack alignItems="center" gap="$3" paddingHorizontal="$4" paddingVertical="$3">
          <View width={44} height={44} borderRadius={22} alignItems="center" justifyContent="center" backgroundColor={PURPLE}>
            <Ionicons
              name={arrived ? 'flag' : error ? 'warning' : maneuverIcon(step?.maneuver ?? '')}
              size={22}
              color="#ffffff"
            />
          </View>
          <YStack flex={1}>
            {loading && (
              <Text color="$textPrimary" fontWeight="600">
                Đang tính đường...
              </Text>
            )}
            {!loading && error && (
              <Text color="$textPrimary" fontWeight="600">
                Không lấy được chỉ đường
              </Text>
            )}
            {!loading && !error && arrived && (
              <Text color="$textPrimary" fontWeight="600">
                Đã đến nơi
              </Text>
            )}
            {!loading && !error && !arrived && step && (
              <>
                <Text color="$textSecondary" fontSize={12}>
                  {distanceToManeuverM != null ? formatManeuverDistance(distanceToManeuverM) : ''}
                </Text>
                <Text color="$textPrimary" fontWeight="700" fontSize={16} numberOfLines={2}>
                  {step.instruction}
                </Text>
              </>
            )}
          </YStack>
          <XStack gap="$2">
            {error && <IconButton name="refresh" onPress={onRefresh} />}
            <IconButton name="close" onPress={onExit} />
          </XStack>
        </XStack>
      </SolidCard>

      {!loading && !error && !arrived && remainingKm != null && remainingMin != null && (
        <SolidCard style={{ position: 'absolute', left: 16, right: 16, bottom: insets.bottom + MAP_OVERLAY_BOTTOM_CLEARANCE }}>
          <XStack justifyContent="center" paddingVertical="$3">
            <Text color="$textPrimary" fontWeight="600">
              {remainingKm} km · {remainingMin} phút còn lại
            </Text>
          </XStack>
        </SolidCard>
      )}
    </>
  )
}
