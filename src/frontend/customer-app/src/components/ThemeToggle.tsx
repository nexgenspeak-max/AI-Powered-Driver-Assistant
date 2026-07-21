import { useEffect } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { GlassMaterial, getConcentricRadius } from './LiquidGlass'

const TRACK_WIDTH = 64
const TRACK_HEIGHT = 34
const TRACK_RADIUS = TRACK_HEIGHT / 2
const THUMB_PADDING = 3
// Thumb radius derived from the track's, not guessed — keeps the two curves
// concentric no matter which of TRACK_HEIGHT/THUMB_PADDING changes later.
const THUMB_RADIUS = getConcentricRadius(TRACK_RADIUS, THUMB_PADDING)
const THUMB_SIZE = THUMB_RADIUS * 2
const THUMB_TRAVEL = TRACK_WIDTH - THUMB_SIZE - THUMB_PADDING * 2

// Off state — light gray, per spec ("nền xám nhạt"). On state fades in a
// real purple gradient layer (below) rather than just a flatter/darker
// tint, so "active" reads as a distinctly colored gradient track, not a
// slightly-tinted version of the same glass.
const TRACK_TINT_OFF = 'rgba(255,255,255,0.2)'
const GRADIENT_COLORS = ['#8B5CF6', '#C084FC'] as const

interface ThemeToggleProps {
  isDark: boolean
  onToggle: () => void
}

// Sun/moon glass pill switch — pill track + circular thumb sliding between
// two icons, rebuilt in this app's frosted-glass material instead of flat
// black/white so it matches every other control (Button, Card, tab bar).
export function ThemeToggle({ isDark, onToggle }: ThemeToggleProps) {
  const progress = useSharedValue(isDark ? 1 : 0)

  useEffect(() => {
    progress.value = withSpring(isDark ? 1 : 0, { damping: 16, stiffness: 180 })
  }, [isDark, progress])

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: progress.value * THUMB_TRAVEL }],
  }))

  // Cross-fades the purple gradient layer in as the toggle turns on, rather
  // than interpolating a single flat color — a real LinearGradient can't be
  // color-interpolated, so it's opacity-faded over the flat off-tint below.
  const gradientOpacityStyle = useAnimatedStyle(() => ({ opacity: progress.value }))

  return (
    <Pressable onPress={onToggle} hitSlop={8} accessibilityRole="switch" accessibilityState={{ checked: isDark }}>
      <View style={{ width: TRACK_WIDTH, height: TRACK_HEIGHT }}>
        <GlassMaterial borderRadius={TRACK_RADIUS} style={{ width: TRACK_WIDTH, height: TRACK_HEIGHT }}>
          <View
            pointerEvents="none"
            style={[StyleSheet.absoluteFillObject, { borderRadius: TRACK_RADIUS, backgroundColor: TRACK_TINT_OFF }]}
          />
          <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFillObject, gradientOpacityStyle]}>
            <LinearGradient
              colors={GRADIENT_COLORS}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[StyleSheet.absoluteFillObject, { borderRadius: TRACK_RADIUS }]}
            />
          </Animated.View>
          <View
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 9,
            }}
          >
            <Ionicons name="sunny" size={14} color={isDark ? 'rgba(255,255,255,0.45)' : '#9ca3af'} />
            <Ionicons name="moon" size={13} color={isDark ? '#ffffff' : 'rgba(124,91,156,0.15)'} />
          </View>
        </GlassMaterial>

        <Animated.View
          style={[
            { position: 'absolute', top: THUMB_PADDING, left: THUMB_PADDING, width: THUMB_SIZE, height: THUMB_SIZE },
            thumbStyle,
          ]}
        >
          <GlassMaterial borderRadius={THUMB_RADIUS} tint="light" style={{ width: THUMB_SIZE, height: THUMB_SIZE }}>
            {/* Small glossy "raised block" sheen — a bright top-left glint
                fading to nothing, distinct from GlassMaterial's own subtle
                wash, so the thumb reads as a small glossy 3D nub rather
                than a flat glass disc. */}
            <LinearGradient
              colors={['rgba(255,255,255,0.9)', 'rgba(255,255,255,0)']}
              start={{ x: 0.25, y: 0.15 }}
              end={{ x: 0.75, y: 0.85 }}
              style={[StyleSheet.absoluteFillObject, { borderRadius: THUMB_RADIUS }]}
              pointerEvents="none"
            />
            <Ionicons name={isDark ? 'moon' : 'sunny'} size={14} color={isDark ? '#7C5B9C' : '#4b5563'} />
          </GlassMaterial>
        </Animated.View>
      </View>
    </Pressable>
  )
}
