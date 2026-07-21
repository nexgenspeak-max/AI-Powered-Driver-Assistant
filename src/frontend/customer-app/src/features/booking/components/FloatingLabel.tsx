import { useEffect } from 'react'
import Animated, { useAnimatedStyle, useSharedValue, withTiming, interpolate, interpolateColor } from 'react-native-reanimated'
import { useTheme } from 'tamagui'

// Field height to assume before the real one is measured (matches
// GlassBookingInput's fixed paddingTop:22/paddingBottom:10 + ~16px text
// line, so the resting position doesn't visibly jump once onLayout fires).
const DEFAULT_FIELD_HEIGHT = 54
const RESTING_FONT_SIZE = 16
const FLOATED_FONT_SIZE = 11
const FLOATED_TOP = 6

export interface FloatingLabelProps {
  label: string
  /** true when the label should be floated up (focused, or has a value) — see the two callers for how they derive this. */
  active: boolean
  /** Measured field height (from the field's own onLayout) — used to vertically center the resting/placeholder position. Falls back to DEFAULT_FIELD_HEIGHT until measured. */
  fieldHeight: number
}

// Shared between GlassBookingInput.tsx and .web.tsx (no Skia dependency, so
// no reason to duplicate this animation logic across both platform files —
// Reanimated itself already runs on both). Purely decorative/absolute —
// pointerEvents="none" so it never steals a tap meant for the real
// TextInput sitting underneath it.
export function FloatingLabel({ label, active, fieldHeight }: FloatingLabelProps) {
  const theme = useTheme()
  const progress = useSharedValue(active ? 1 : 0)
  const height = fieldHeight > 0 ? fieldHeight : DEFAULT_FIELD_HEIGHT

  useEffect(() => {
    progress.value = withTiming(active ? 1 : 0, { duration: 160 })
  }, [active, progress])

  const animatedStyle = useAnimatedStyle(() => {
    const restingTop = height / 2 - RESTING_FONT_SIZE / 2
    return {
      top: interpolate(progress.value, [0, 1], [restingTop, FLOATED_TOP]),
      fontSize: interpolate(progress.value, [0, 1], [RESTING_FONT_SIZE, FLOATED_FONT_SIZE]),
      color: interpolateColor(progress.value, [0, 1], [theme.textMuted.val, theme.textSecondary.val]),
    }
  })

  return (
    <Animated.Text
      pointerEvents="none"
      style={[{ position: 'absolute', left: 16, fontWeight: '500' }, animatedStyle]}
      numberOfLines={1}
    >
      {label}
    </Animated.Text>
  )
}
