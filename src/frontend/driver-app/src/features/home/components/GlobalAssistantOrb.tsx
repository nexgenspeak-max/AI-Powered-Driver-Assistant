import { useEffect, useRef, useState } from 'react'
import { Alert, StyleSheet, View, useWindowDimensions } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { usePathname } from 'expo-router'
import { Text } from 'tamagui'
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg'
import { GlassMaterial } from '../../../components/LiquidGlass'
import { useVoiceSessionStore, type VoiceSessionStatus } from '../stores/voiceSessionStore'
import { useAssistantChatStore } from '../stores/assistantChatStore'
import { useCurrentUser } from '../../auth/hooks/useCurrentUser'

// Single persistent draggable "chat head" bubble, mounted once at the (app)
// layout level, shown on every tab including Home.
//
// This used to render the 3D dot-sphere orb (AssistantAvatar/Three.js)
// cropped down to bubble size, but at 60px that read as visual noise (a
// dense point-cloud built to be seen at 360px just looks like static once
// cropped in) sitting on a translucent glass background that washed out
// against whatever was on screen behind it — no amount of recoloring or
// slowing the animation fixed either problem, because neither was the
// actual cause. This is a deliberately simple replacement instead: a flat
// glossy gradient disc on an opaque dark backing (guaranteed contrast
// regardless of what's behind it or which app theme is active) with a soft
// pulsing glow ring whose color/speed reflects call status — closer to how
// real chat-head bubbles (Messenger, etc.) actually look: calm and
// legible at a glance, not a detailed animation to stare at. Also drops the
// GLView/Three.js render loop entirely, which used to run continuously
// app-wide even when idle.
const BUBBLE_SIZE = 60
const GLOW_SIZE = Math.round(BUBBLE_SIZE * 1.7)
const EDGE_MARGIN = 12
const TAB_BAR_CLEARANCE = 120 // keeps drag bounds clear of the floating tab bar
const TAP_MAX_MOVEMENT = 8
const SNAP_SPRING = { damping: 16, stiffness: 180 }
const EXPANDED_TEXT_MS = 4500
const CARD_WIDTH = 220

// [bright, mid, dark] radial-gradient stops per status — same brand purple
// family used everywhere else in the app, amber only for "connecting" as a
// distinct in-progress cue, red for a real error.
const STATUS_GRADIENT: Record<VoiceSessionStatus, [string, string, string]> = {
  idle: ['#c4b5fd', '#7c3aed', '#2e1065'],
  connecting: ['#fde68a', '#f59e0b', '#7c2d12'],
  connected: ['#e9d5ff', '#a855f7', '#4c1d95'],
  error: ['#fecaca', '#e05252', '#7f1d1d'],
}
const STATUS_GLOW_COLOR: Record<VoiceSessionStatus, string> = {
  idle: '#7c3aed',
  connecting: '#f59e0b',
  connected: '#a855f7',
  error: '#e05252',
}
// One full pulse cycle (ms each way) — 0 means "no pulse", just settle to a
// low, static glow. Idle stays still (nothing's happening); connecting
// pulses briskly (visibly "working"); connected breathes slowly (calm, but
// still reads as live); error stays still too, its red already stands out.
const PULSE_DURATION: Record<VoiceSessionStatus, number> = {
  idle: 0,
  connecting: 480,
  connected: 1400,
  error: 0,
}

export function GlobalAssistantOrb() {
  const voice = useVoiceSessionStore()
  const chats = useAssistantChatStore(s => s.chats)
  const { data: driver } = useCurrentUser()
  const pathname = usePathname()
  const insets = useSafeAreaInsets()
  const { width, height } = useWindowDimensions()

  // Home already shows the full scrolling chat log itself — the popup text
  // card would just be a redundant duplicate of what's already on screen
  // there, so it's suppressed on that one tab only. Position/drag/tap
  // behavior is otherwise identical on every tab, Home included.
  const isHome = pathname === '/'

  const [expandedText, setExpandedText] = useState<string | null>(null)
  const [snappedRight, setSnappedRight] = useState(true)
  const [cardHeight, setCardHeight] = useState(80)
  const lastChatCountRef = useRef(chats.length)
  const collapseTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const minX = EDGE_MARGIN
  const maxX = width - BUBBLE_SIZE - EDGE_MARGIN
  const minY = insets.top + EDGE_MARGIN
  const maxY = height - insets.bottom - TAB_BAR_CLEARANCE

  const x = useSharedValue(maxX)
  const y = useSharedValue(Math.min(Math.max(height * 0.32, minY), maxY))
  const startX = useSharedValue(0)
  const startY = useSharedValue(0)
  const pressScale = useSharedValue(1)
  const pulse = useSharedValue(0)

  const handleOrbPress = () => {
    if (voice.status === 'connecting') return
    if (voice.status === 'connected') {
      if (voice.isCallActive) {
        Alert.alert('Đang trong cuộc gọi', 'Không thể tắt trong lúc đang gọi điện. Vui lòng đợi cuộc gọi kết thúc.')
        return
      }
      voice.disconnect()
      return
    }
    if (!driver?.phone) {
      Alert.alert('Lỗi', 'Không tìm thấy số điện thoại tài xế.')
      return
    }
    voice.connect(driver.phone)
  }

  const pan = Gesture.Pan()
    .minDistance(0)
    .onBegin(() => {
      startX.value = x.value
      startY.value = y.value
      pressScale.value = withTiming(0.94, { duration: 100 })
    })
    .onUpdate(e => {
      x.value = Math.min(maxX, Math.max(minX, startX.value + e.translationX))
      y.value = Math.min(maxY, Math.max(minY, startY.value + e.translationY))
    })
    .onEnd(e => {
      pressScale.value = withTiming(1, { duration: 150 })
      if (Math.abs(e.translationX) + Math.abs(e.translationY) < TAP_MAX_MOVEMENT) {
        runOnJS(handleOrbPress)()
        return
      }
      const goRight = x.value + BUBBLE_SIZE / 2 > width / 2
      x.value = withSpring(goRight ? maxX : minX, SNAP_SPRING)
      runOnJS(setSnappedRight)(goRight)
    })
    .onFinalize(() => {
      pressScale.value = withTiming(1, { duration: 150 })
    })

  const wrapStyle = useAnimatedStyle(() => ({
    left: x.value,
    top: y.value,
    transform: [{ scale: pressScale.value }],
  }))

  const glowStyle = useAnimatedStyle(() => ({
    opacity: 0.25 + pulse.value * 0.45,
    transform: [{ scale: 0.85 + pulse.value * 0.25 }],
  }))

  const cardStyle = useAnimatedStyle(() => {
    const rawLeft = snappedRight ? x.value + BUBBLE_SIZE - CARD_WIDTH : x.value
    return {
      left: Math.min(Math.max(rawLeft, EDGE_MARGIN), width - CARD_WIDTH - EDGE_MARGIN),
      top: Math.max(y.value - cardHeight - 10, insets.top + 4),
    }
  })

  // Drives the glow ring's pulse rate/style from call status — briskly for
  // "connecting" (visibly working), a slow breathe for "connected" (calm,
  // still alive), settled/still for idle and error.
  useEffect(() => {
    const duration = PULSE_DURATION[voice.status]
    if (duration > 0) {
      pulse.value = withRepeat(withSequence(withTiming(1, { duration }), withTiming(0, { duration })), -1, true)
    } else {
      pulse.value = withTiming(0.3, { duration: 400 })
    }
  }, [voice.status, pulse])

  // Pops the AI's latest reply up as a text card while off the Home tab
  // (Home already shows the full scrolling chat), then auto-collapses.
  useEffect(() => {
    if (chats.length > lastChatCountRef.current) {
      const last = chats[chats.length - 1]
      if (last?.who === 'bot' && !isHome) {
        setExpandedText(last.msg)
        if (collapseTimer.current) clearTimeout(collapseTimer.current)
        collapseTimer.current = setTimeout(() => setExpandedText(null), EXPANDED_TEXT_MS)
      }
    }
    lastChatCountRef.current = chats.length
  }, [chats, isHome])

  useEffect(() => {
    if (isHome) setExpandedText(null)
  }, [isHome])

  useEffect(
    () => () => {
      if (collapseTimer.current) clearTimeout(collapseTimer.current)
    },
    [],
  )

  const [bright, mid, dark] = STATUS_GRADIENT[voice.status]
  const glowColor = STATUS_GLOW_COLOR[voice.status]

  return (
    <>
      {expandedText ? (
        <Animated.View
          style={[styles.cardWrap, cardStyle]}
          onLayout={e => setCardHeight(e.nativeEvent.layout.height)}
          pointerEvents="none"
        >
          <GlassMaterial borderRadius={18}>
            <Text numberOfLines={4} color="$textPrimary" fontSize="$1" padding={10} textAlign="center">
              {expandedText}
            </Text>
          </GlassMaterial>
        </Animated.View>
      ) : null}
      <GestureDetector gesture={pan}>
        <Animated.View style={[styles.shadowWrap, wrapStyle]}>
          {/* Soft pulsing halo, centered behind the bubble — sized bigger
              than the bubble itself and NOT clipped by its circular clip,
              so the glow can bleed outward instead of getting cut off at
              the bubble's own edge. */}
          <Animated.View style={[styles.glow, glowStyle]} pointerEvents="none">
            <Svg width={GLOW_SIZE} height={GLOW_SIZE}>
              <Defs>
                <RadialGradient id="orbGlow" cx="50%" cy="50%" r="50%">
                  <Stop offset="0%" stopColor={glowColor} stopOpacity={0.55} />
                  <Stop offset="60%" stopColor={glowColor} stopOpacity={0.22} />
                  <Stop offset="100%" stopColor={glowColor} stopOpacity={0} />
                </RadialGradient>
              </Defs>
              <Circle cx="50%" cy="50%" r="50%" fill="url(#orbGlow)" />
            </Svg>
          </Animated.View>

          <View style={styles.clipWrap}>
            {/* Opaque dark backing — guarantees the gradient disc above it
                reads clearly regardless of what's on screen behind the
                bubble, or which app theme is active. */}
            <View style={[StyleSheet.absoluteFillObject, styles.backing]} />
            <Svg width={BUBBLE_SIZE} height={BUBBLE_SIZE} style={StyleSheet.absoluteFill}>
              <Defs>
                {/* Off-center highlight (35%/30%) reads as a glossy top-lit
                    sphere/bubble instead of a flat disc. */}
                <RadialGradient id="orbFill" cx="35%" cy="30%" r="75%">
                  <Stop offset="0%" stopColor={bright} />
                  <Stop offset="55%" stopColor={mid} />
                  <Stop offset="100%" stopColor={dark} />
                </RadialGradient>
              </Defs>
              <Circle cx="50%" cy="50%" r="50%" fill="url(#orbFill)" />
            </Svg>
            <View style={[StyleSheet.absoluteFillObject, styles.rim]} pointerEvents="none" />
          </View>
        </Animated.View>
      </GestureDetector>
    </>
  )
}

const styles = StyleSheet.create({
  shadowWrap: {
    position: 'absolute',
    width: BUBBLE_SIZE,
    height: BUBBLE_SIZE,
    zIndex: 60,
    elevation: 60,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  glow: {
    position: 'absolute',
    width: GLOW_SIZE,
    height: GLOW_SIZE,
    left: -(GLOW_SIZE - BUBBLE_SIZE) / 2,
    top: -(GLOW_SIZE - BUBBLE_SIZE) / 2,
  },
  clipWrap: {
    flex: 1,
    borderRadius: BUBBLE_SIZE / 2,
    overflow: 'hidden',
  },
  backing: {
    backgroundColor: '#0f0720',
  },
  rim: {
    borderRadius: BUBBLE_SIZE / 2,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  cardWrap: { position: 'absolute', width: CARD_WIDTH, zIndex: 59, elevation: 59 },
})
