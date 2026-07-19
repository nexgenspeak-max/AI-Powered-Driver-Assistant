import { Gesture, type ComposedGesture } from 'react-native-gesture-handler'
import {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated'

// Pill/button deformation — stretches toward the touch point on press, then
// springs back. Verbatim port of `liquidGlassTransform` from
// linear-tab-bar/src/components/TabBar/constants.ts.
const MAX_PULL = 60
const MAX_STRETCH = 0.1
const MAX_COMPRESS = 0.12

export function liquidGlassTransform(pressed: number, overflowX: number, overflowY: number, halfW: number, halfH: number) {
  'worklet'
  const pressScale = interpolate(pressed, [0, 1], [1, 1.02])
  const signX = overflowX < 0 ? -1 : 1
  const dampedX = signX * MAX_PULL * (1 - 1 / (Math.abs(overflowX) / MAX_PULL + 1))
  const signY = overflowY < 0 ? -1 : 1
  const dampedY = signY * MAX_PULL * (1 - 1 / (Math.abs(overflowY) / MAX_PULL + 1))
  const absDX = Math.abs(dampedX)
  const absDY = Math.abs(dampedY)
  const stretchX = interpolate(absDX, [0, MAX_PULL], [0, MAX_STRETCH], 'clamp')
  const stretchY = interpolate(absDY, [0, MAX_PULL], [0, MAX_STRETCH], 'clamp')
  const compressX = interpolate(absDY, [0, MAX_PULL], [0, MAX_COMPRESS], 'clamp')
  const compressY = interpolate(absDX, [0, MAX_PULL], [0, MAX_COMPRESS], 'clamp')
  return {
    transform: [
      { translateX: signX * halfW * stretchX },
      { translateY: signY * halfH * stretchY },
      { scaleX: pressScale * (1 + stretchX) * (1 - compressX) },
      { scaleY: pressScale * (1 + stretchY) * (1 - compressY) },
    ],
  }
}

interface UseGlassPressOptions {
  onPress?: () => void
  enabled?: boolean
  /** Extra invisible margin added to the tap/pan hit area on every side, without changing layout. */
  hitSlop?: number
}

// Gesture-driven press state for a glass surface: a Race between Tap (fires
// `onPress`) and Pan (tracks how far the touch drags past the surface's own
// bounds) — same composition as linear-tab-bar's useSearchGestures, adapted
// for a single self-contained button instead of a multi-zone pill.
export function useGlassPress(width: number, height: number, options: UseGlassPressOptions = {}) {
  const { onPress, enabled = true, hitSlop } = options

  const pressed = useSharedValue(0)
  const overflowX = useSharedValue(0)
  const overflowY = useSharedValue(0)
  const touchX = useSharedValue(width / 2)
  const touchY = useSharedValue(height / 2)
  const glowOpacity = useSharedValue(0)

  const halfW = width / 2
  const halfH = height / 2

  const tapGesture = Gesture.Tap()
    .onBegin(e => {
      touchX.value = e.x
      touchY.value = e.y
      pressed.value = withTiming(1, { duration: 80 })
      glowOpacity.value = withTiming(1, { duration: 120 })
    })
    .onFinalize(() => {
      pressed.value = withTiming(0, { duration: 150 })
      glowOpacity.value = withTiming(0, { duration: 220 })
    })
    .onEnd(() => {
      if (onPress) runOnJS(onPress)()
    })
    .enabled(enabled)
    .hitSlop(hitSlop ?? 0)

  const panGesture = Gesture.Pan()
    .minDistance(1)
    .onBegin(e => {
      touchX.value = e.x
      touchY.value = e.y
      pressed.value = withTiming(1, { duration: 80 })
      glowOpacity.value = withTiming(1, { duration: 120 })
    })
    .onUpdate(e => {
      touchX.value = e.x
      touchY.value = e.y
      overflowX.value = e.x < 0 ? e.x : e.x > width ? e.x - width : 0
      overflowY.value = e.y < 0 ? e.y : e.y > height ? e.y - height : 0
    })
    .onFinalize(() => {
      pressed.value = withTiming(0, { duration: 150 })
      overflowX.value = withSpring(0, { damping: 22, stiffness: 250, mass: 0.6 })
      overflowY.value = withSpring(0, { damping: 22, stiffness: 250, mass: 0.6 })
      glowOpacity.value = withTiming(0, { duration: 220 })
    })
    .enabled(enabled)
    .hitSlop(hitSlop ?? 0)

  const gesture: ComposedGesture = Gesture.Race(panGesture, tapGesture)

  const stretchStyle = useAnimatedStyle(() =>
    liquidGlassTransform(pressed.value, overflowX.value, overflowY.value, halfW, halfH)
  )

  return { gesture, stretchStyle, touchX, touchY, glowOpacity }
}
