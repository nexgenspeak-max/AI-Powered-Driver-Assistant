import { useEffect } from 'react'
import type { DimensionValue, ViewStyle } from 'react-native'
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated'
import { useTheme } from 'tamagui'

// Placeholder block for loading states — replaces full-screen
// <ActivityIndicator> on the dashboard / earnings / trips / trip-status
// screens. Compose a few of these to sketch the shape of the content that's
// coming. Spinners stay only inside buttons.
//
// Duplicated in customer-app/src/components/Skeleton.tsx.

export type SkeletonProps = {
  width?: DimensionValue
  height?: number
  radius?: number
  style?: ViewStyle
}

export function Skeleton({
  width = '100%',
  height = 16,
  radius = 8,
  style,
}: SkeletonProps) {
  const theme = useTheme()
  const reduced = useReducedMotion()
  const opacity = useSharedValue(0.55)

  useEffect(() => {
    if (reduced) {
      opacity.value = 0.7
      return
    }
    opacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 700 }),
        withTiming(0.55, { duration: 700 }),
      ),
      -1,
      true,
    )
  }, [reduced, opacity])

  const anim = useAnimatedStyle(() => ({ opacity: opacity.value }))

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius: radius,
          backgroundColor: theme.surfaceVariant.val,
        },
        anim,
        style,
      ]}
    />
  )
}
