import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated'
import Svg, { Defs, RadialGradient, Stop, Rect } from 'react-native-svg'

export interface GlowOverlayProps {
  size: number
  id: string
  touchX: SharedValue<number>
  touchY: SharedValue<number>
  glowOpacity: SharedValue<number>
}

// Soft radial highlight that follows the touch point — react-native-svg
// RadialGradient, same as linear-tab-bar's SearchBar.tsx `GlowOverlay`.
export function GlowOverlay({ size, id, touchX, touchY, glowOpacity }: GlowOverlayProps) {
  const half = size / 2

  const style = useAnimatedStyle(() => ({
    opacity: glowOpacity.value * 0.35,
    transform: [{ translateX: touchX.value - half }, { translateY: touchY.value - half }],
  }))

  return (
    <Animated.View
      style={[{ position: 'absolute', top: 0, left: 0, width: size, height: size }, style]}
      pointerEvents="none"
    >
      <Svg width={size} height={size}>
        <Defs>
          <RadialGradient id={id} cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#fff" stopOpacity={1} />
            <Stop offset="100%" stopColor="#fff" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect width={size} height={size} fill={`url(#${id})`} />
      </Svg>
    </Animated.View>
  )
}
