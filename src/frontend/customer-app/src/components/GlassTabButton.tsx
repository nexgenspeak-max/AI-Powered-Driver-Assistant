import { useState } from 'react'
import { View, type GestureResponderEvent, type LayoutChangeEvent } from 'react-native'
import { GestureDetector } from 'react-native-gesture-handler'
import { LinearGradient } from 'expo-linear-gradient'
import Animated from 'react-native-reanimated'
import { GlassSheen, GlowOverlay, useGlassPress } from './LiquidGlass'

interface TabButtonProps {
  children?: React.ReactNode
  onPress?: ((e: GestureResponderEvent) => void) | null
  accessibilityState?: { selected?: boolean }
  style?: any
}

// "Water/glass droplet" active-tab button — wraps the icon AND label together
// in one glossy rounded blob (gradient fill + gradient sheen), instead of a
// flat badge behind just the icon. Stretches toward the touch point on press
// (liquidGlassTransform) and shows a soft glow that follows the finger — see
// ./LiquidGlass, ported from https://github.com/SchroederNathan/linear-tab-bar.
// Passed to expo-router's `Tabs` as `screenOptions.tabBarButton`.
export function GlassTabButton({ children, onPress, accessibilityState, style }: TabButtonProps) {
  const focused = !!accessibilityState?.selected
  const [size, setSize] = useState({ width: 60, height: 44 })

  const { gesture, stretchStyle, touchX, touchY, glowOpacity } = useGlassPress(size.width, size.height, {
    onPress: () => (onPress as ((e?: GestureResponderEvent) => void) | null | undefined)?.(),
    // Each tab button already spans its full column, but a bit of extra
    // margin around the visible pill makes it noticeably easier to hit with
    // a thumb, especially for the inactive (icon-only, no background) tabs.
    hitSlop: 20,
  })

  const handleLayout = (e: LayoutChangeEvent) => {
    setSize({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })
  }

  if (!focused) {
    return (
      <GestureDetector gesture={gesture}>
        <Animated.View
          onLayout={handleLayout}
          style={[style, stretchStyle, { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }]}
        >
          <GlowOverlay size={90} id="tabGlowInactive" touchX={touchX} touchY={touchY} glowOpacity={glowOpacity} />
          {children}
        </Animated.View>
      </GestureDetector>
    )
  }

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        onLayout={handleLayout}
        style={[style, stretchStyle, { alignItems: 'center', justifyContent: 'center', paddingVertical: 4 }]}
      >
        <View
          style={{
            borderRadius: 22,
            shadowColor: '#A855F7',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.65,
            shadowRadius: 14,
            elevation: 10,
          }}
        >
          <LinearGradient
            colors={['#9a7ab8', '#7C5B9C', '#A855F7']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              borderRadius: 22,
              paddingHorizontal: 14,
              paddingVertical: 7,
              alignItems: 'center',
              gap: 2,
              overflow: 'hidden',
            }}
          >
            <GlassSheen borderRadius={22} />
            <GlowOverlay size={100} id="tabGlowActive" touchX={touchX} touchY={touchY} glowOpacity={glowOpacity} />
            {children}
          </LinearGradient>
        </View>
      </Animated.View>
    </GestureDetector>
  )
}
