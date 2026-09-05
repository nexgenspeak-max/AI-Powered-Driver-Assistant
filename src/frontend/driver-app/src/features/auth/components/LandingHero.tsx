import { useEffect } from 'react'
import { StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { View, useTheme, useThemeName } from 'tamagui'
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated'

const HERO_SIZE = 220
const ORB_SIZE = 112

/**
 * Animated hero: AI orb + call/mic satellites.
 * Theme only changes surface alphas / primary tint — same glyphs and positions
 * in light and dark (no light/dark PNG swaps; those assets differ in artwork).
 */
export function LandingHero() {
  const isLight = useThemeName() === 'light'
  const theme = useTheme()
  const reduced = useReducedMotion()
  const breathe = useSharedValue(0)
  const pulse = useSharedValue(0)
  const floatA = useSharedValue(0)
  const floatB = useSharedValue(0)

  // Brand purple fills need different alpha on light vs dark so rings/orb
  // stay visible (WCAG-ish) without looking muddy on either background.
  const primary = theme.primary.val
  const ringBorder = isLight ? `${primary}66` : `${primary}73`
  const orbFill = isLight ? `${primary}1F` : `${primary}2E`
  const badgeFill = isLight ? `${primary}24` : `${primary}38`
  const badgeBorder = isLight ? `${primary}40` : `${primary}55`

  useEffect(() => {
    if (reduced) {
      breathe.value = 0
      pulse.value = 0
      floatA.value = 0
      floatB.value = 0
      return
    }
    breathe.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 1600, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    )
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1800, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: 0 }),
      ),
      -1,
      false,
    )
    floatA.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 2200, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    )
    floatB.value = withDelay(
      400,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 2400, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: 2400, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        false,
      ),
    )
  }, [reduced, breathe, pulse, floatA, floatB])

  const orbStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + breathe.value * 0.06 }],
  }))

  const ringStyle = useAnimatedStyle(() => ({
    opacity: (isLight ? 0.55 : 0.45) * (1 - pulse.value),
    transform: [{ scale: 1 + pulse.value * 0.55 }],
  }))

  const ring2Style = useAnimatedStyle(() => ({
    opacity: (isLight ? 0.35 : 0.28) * (1 - pulse.value),
    transform: [{ scale: 1.15 + pulse.value * 0.7 }],
  }))

  const badgeAStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -6 + floatA.value * 12 }],
  }))

  const badgeBStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: 4 - floatB.value * 12 }],
  }))

  return (
    <View
      width={HERO_SIZE}
      height={HERO_SIZE}
      alignItems="center"
      justifyContent="center"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Animated.View style={[styles.ring, { borderColor: ringBorder }, ring2Style]} />
      <Animated.View style={[styles.ring, { borderColor: ringBorder }, ringStyle]} />

      <Animated.View style={[styles.orb, { backgroundColor: orbFill }, orbStyle]}>
        <Ionicons name="mic" size={56} color={primary} />
      </Animated.View>

      <Animated.View
        style={[
          styles.badge,
          styles.badgePhone,
          { backgroundColor: badgeFill, borderColor: badgeBorder, borderWidth: 1 },
          badgeAStyle,
        ]}
      >
        <Ionicons name="call" size={26} color={primary} />
      </Animated.View>

      <Animated.View
        style={[
          styles.badge,
          styles.badgeMic,
          { backgroundColor: badgeFill, borderColor: badgeBorder, borderWidth: 1 },
          badgeBStyle,
        ]}
      >
        <Ionicons name="mic-outline" size={26} color={primary} />
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  ring: {
    position: 'absolute',
    width: ORB_SIZE + 48,
    height: ORB_SIZE + 48,
    borderRadius: 999,
    borderWidth: 2,
  },
  orb: {
    width: ORB_SIZE,
    height: ORB_SIZE,
    borderRadius: ORB_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgePhone: {
    right: 8,
    top: 36,
  },
  badgeMic: {
    left: 8,
    bottom: 40,
  },
})
