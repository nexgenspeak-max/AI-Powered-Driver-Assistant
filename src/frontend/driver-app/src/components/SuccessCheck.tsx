import { useEffect } from 'react'
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated'
import { View } from 'tamagui'
import { Icon } from './icons'
import { haptics } from '../utils/haptics'

// A brief positive-outcome moment: a green disc + checkmark springs in, fires a
// success haptic, then calls `onDone` ~1.2s later. Used at "Hoàn thành chuyến"
// (driver) and "Đặt xe thành công" (customer) before navigating on.
//
// Duplicated in customer-app/src/components/SuccessCheck.tsx.

export type SuccessCheckProps = {
  size?: number
  onDone?: () => void
}

export function SuccessCheck({ size = 72, onDone }: SuccessCheckProps) {
  const reduced = useReducedMotion()
  const s = useSharedValue(reduced ? 1 : 0)

  useEffect(() => {
    haptics.success()
    if (!reduced) {
      s.value = withSpring(1, { damping: 12, stiffness: 180 })
    }
    const t = setTimeout(() => onDone?.(), 1200)
    return () => clearTimeout(t)
  }, [reduced, s, onDone])

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: s.value }],
    opacity: s.value,
  }))

  return (
    <Animated.View style={style}>
      <View
        width={size}
        height={size}
        borderRadius={size / 2}
        backgroundColor="$success"
        alignItems="center"
        justifyContent="center"
      >
        <Icon name="check" size={size * 0.55} color="#ffffff" />
      </View>
    </Animated.View>
  )
}
