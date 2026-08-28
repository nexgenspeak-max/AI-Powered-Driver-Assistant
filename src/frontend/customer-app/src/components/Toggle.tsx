import { useEffect } from 'react'
import { Pressable } from 'react-native'
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'
import { useTheme } from 'tamagui'
import { haptics } from '../utils/haptics'

// Replaces React Native's <Switch> everywhere (dashboard online/offline, the
// profile settings rows). Same controlled API — `value` / `onValueChange` —
// so swapping it in is a straight rename.
//
// Duplicated in customer-app/src/components/Toggle.tsx.

const W = 52
const H = 32
const PAD = 3
const THUMB = H - PAD * 2

export type ToggleProps = {
  value: boolean
  onValueChange: (value: boolean) => void
  disabled?: boolean
  /** On-state track colour. Defaults to `$success` (matches the old Switch). */
  onColor?: string
  accessibilityLabel?: string
}

export function Toggle({
  value,
  onValueChange,
  disabled = false,
  onColor,
  accessibilityLabel,
}: ToggleProps) {
  const theme = useTheme()
  const reduced = useReducedMotion()
  const p = useSharedValue(value ? 1 : 0)

  useEffect(() => {
    p.value = withTiming(value ? 1 : 0, { duration: reduced ? 0 : 160 })
  }, [value, reduced, p])

  const offColor = theme.borderStrong.val
  const activeColor = onColor ?? theme.success.val

  const trackStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(p.value, [0, 1], [offColor, activeColor]),
  }))
  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: p.value * (W - THUMB - PAD * 2) }],
  }))

  return (
    <Pressable
      disabled={disabled}
      onPress={() => {
        haptics.selection()
        onValueChange(!value)
      }}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      accessibilityLabel={accessibilityLabel}
      hitSlop={8}
      style={{ opacity: disabled ? 0.4 : 1 }}
    >
      <Animated.View
        style={[
          { width: W, height: H, borderRadius: H / 2, padding: PAD, justifyContent: 'center' },
          trackStyle,
        ]}
      >
        <Animated.View
          style={[
            {
              width: THUMB,
              height: THUMB,
              borderRadius: THUMB / 2,
              backgroundColor: '#ffffff',
              boxShadow: '0px 1px 3px rgba(0,0,0,0.25)',
            },
            thumbStyle,
          ]}
        />
      </Animated.View>
    </Pressable>
  )
}
