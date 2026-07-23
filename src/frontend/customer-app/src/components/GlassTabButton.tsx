import { useState } from 'react'
import { View, type GestureResponderEvent, type LayoutChangeEvent } from 'react-native'
import { GestureDetector } from 'react-native-gesture-handler'
import { LinearGradient } from 'expo-linear-gradient'
import Animated from 'react-native-reanimated'
import { useThemeName } from 'tamagui'
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
  const isLight = useThemeName() === 'light'
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

  // Light mode: no filled pill behind the active tab — a black pill would
  // just hide the black active-tint text again (same bug as the earlier
  // white-on-white pass, mirrored). Active vs. inactive there is purely the
  // darker/lighter text-icon color set via tabBarActiveTintColor in
  // app/_layout.tsx, so this renders identically to the unfocused branch.
  if (!focused || isLight) {
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

  // Dark mode active tab: unchanged glossy purple gradient pill.
  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        onLayout={handleLayout}
        style={[style, stretchStyle, { alignItems: 'center', justifyContent: 'center', paddingVertical: 4 }]}
      >
        <View
          style={{
            // 999, not a guessed fixed number — RN clamps to the box's own
            // half-height automatically (same trick as Button's `$button`
            // token), so this is always a true full pill/stadium shape
            // regardless of icon+label height, instead of a fixed radius
            // that under-rounds once the actual content is taller than
            // whatever number was guessed.
            borderRadius: 999,
            shadowColor: '#A855F7',
            shadowOffset: { width: 0, height: 4 },
            // Radius 18/opacity 0.55 on a ~60x44 pill blurred into a big
            // shapeless halo (worse still against the blurred tab-bar
            // background behind it) — tightened so the pill itself reads as
            // the active-tab indicator, not the glow around it.
            shadowOpacity: 0.35,
            shadowRadius: 8,
            elevation: 6,
          }}
        >
          <LinearGradient
            colors={['#9a7ab8', '#7C5B9C', '#A855F7']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              borderRadius: 999,
              paddingHorizontal: 14,
              paddingVertical: 7,
              alignItems: 'center',
              gap: 2,
              overflow: 'hidden',
            }}
          >
            <GlassSheen borderRadius={999} />
            <GlowOverlay size={100} id="tabGlowActive" touchX={touchX} touchY={touchY} glowOpacity={glowOpacity} />
            {children}
          </LinearGradient>
        </View>
      </Animated.View>
    </GestureDetector>
  )
}
