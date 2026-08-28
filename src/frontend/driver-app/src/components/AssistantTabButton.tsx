/**
 * AssistantTabButton.tsx
 * -----------------------------------------------------------------------
 * Raised "Trợ lý" (AI assistant) button that sits in the middle of the
 * bottom tab bar, poking up above its top edge — shared by both
 * LiquidGlassTabBar.tsx (native) and LiquidGlassTabBar.web.tsx, which each
 * reserve an empty slot for it in their own tab row and pass down where its
 * center should land.
 *
 * Ported from the old GlobalAssistantOrb.tsx (a free-floating, draggable
 * bubble mounted once at the (app) layout level — see git history for the
 * full design rationale on the gradient-disc-over-opaque-backing approach)
 * minus the drag-to-reposition logic: now anchored at a fixed spot in the
 * tab row, so there's nothing left to drag. GlobalAssistantOrb.tsx itself is
 * gone; this is its replacement.
 *
 * Uses react-native-svg + Reanimated only (no Skia) — same as the orb it
 * replaces, which had no .web.tsx variant and ran fine on web already.
 */

import { useEffect, useRef, useState } from 'react'
import { AccessibilityInfo, Alert, LayoutChangeEvent, Pressable, StyleSheet, View } from 'react-native'
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useFrameCallback,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated'
import { Text } from 'tamagui'
import { Ionicons } from '@expo/vector-icons'
import Svg, { Circle, Defs, Path, RadialGradient, Stop } from 'react-native-svg'
import { usePathname } from 'expo-router'
import { GlassMaterial } from './LiquidGlass'
import { useVoiceSessionStore, type VoiceSessionStatus } from '../features/home/stores/voiceSessionStore'
import { useAssistantChatStore } from '../features/home/stores/assistantChatStore'
import { useCurrentUser } from '../features/auth/hooks/useCurrentUser'

export const BUTTON_SIZE = 56
// How far above the tab bar's top edge the button pokes. Lowered from an
// earlier 0.62 — poking up that far collided with driver-app's turn-by-turn
// NavigationHud overlay (rendered above the tab bar on the trip/map screen).
export const BUTTON_RISE = Math.round(BUTTON_SIZE * 0.4)

const GLOW_SIZE = Math.round(BUTTON_SIZE * 1.6)
const EXPANDED_TEXT_MS = 4500
const CARD_WIDTH = 220
const CARD_MARGIN = 8

// --- The orb's own edge undulates ---------------------------------------
// While connecting/connected the disc is drawn as a <Path> whose radius
// ripples via a sum of sine harmonics with a slowly drifting phase (the
// 0→2π `phase` clock) — the button's own outline flows, there is no extra
// ring. `level` (a slow envelope on voice.agentAudioLevel) lifts the ripple
// while the AI is talking; it is heavily smoothed so the motion reads as
// "assistant is speaking", not a twitch on every word.
const AnimatedPath = Animated.createAnimatedComponent(Path)

const ORB_BOX = BUTTON_SIZE + 40
const ORB_C = ORB_BOX / 2
const ORB_BASE_R = BUTTON_SIZE / 2 - 1

// `spd` (the phase multiplier) values are whole numbers, so every harmonic
// returns to its start when the phase clock wraps 2π→0 — seamless loop.
// Only low modes (k = 2, 3) with a tiny magnitude, so the outline keeps
// reading as a circle — it just breathes at the edge, never a blob.
const ORB_WAVE: { k: number; mag: number; spd: number }[] = [
  { k: 2, mag: 1.1, spd: 1 },
  { k: 3, mag: 0.7, spd: -2 },
]

function buildOrbPath(phase: number, amp: number) {
  'worklet'
  const STEPS = 64
  const maxR = ORB_C - 2
  let d = 'M'
  for (let i = 0; i <= STEPS; i++) {
    const ang = (i / STEPS) * Math.PI * 2
    let r = ORB_BASE_R
    for (let h = 0; h < ORB_WAVE.length; h++) {
      const w = ORB_WAVE[h]
      r += w.mag * amp * Math.sin(w.k * ang + phase * w.spd)
    }
    if (r > maxR) r = maxR
    const x = ORB_C + r * Math.cos(ang)
    const y = ORB_C + r * Math.sin(ang)
    d += (i === 0 ? '' : 'L') + x + ' ' + y + ' '
  }
  return d + 'Z'
}

// idle's bright/dark ends are the exact brand pair requested — #C084FC /
// #6D28D9 — with a mid stop interpolated between them for the radial fill.
const STATUS_GRADIENT: Record<VoiceSessionStatus, [string, string, string]> = {
  idle: ['#C084FC', '#9333EA', '#6D28D9'],
  connecting: ['#ede9fe', '#a855f7', '#5b21b6'],
  connected: ['#e9d5ff', '#a855f7', '#4c1d95'],
  error: ['#fecaca', '#e05252', '#7f1d1d'],
}
const STATUS_GLOW_COLOR: Record<VoiceSessionStatus, string> = {
  idle: '#9333EA',
  connecting: '#a855f7',
  connected: '#a855f7',
  error: '#e05252',
}
const PULSE_DURATION: Record<VoiceSessionStatus, number> = {
  idle: 0,
  connecting: 480,
  connected: 1400,
  error: 0,
}
const STATUS_ACCESSIBILITY_LABEL: Record<VoiceSessionStatus, string> = {
  idle: 'Trợ lý giọng nói, đang tắt. Nhấn để bắt đầu.',
  connecting: 'Trợ lý giọng nói, đang kết nối.',
  connected: 'Trợ lý giọng nói, đang kết nối. Nhấn để tắt.',
  error: 'Trợ lý giọng nói, đã xảy ra lỗi.',
}
// Icon swaps with connection state instead of a fixed glyph — makes what
// tapping the button will DO explicit (start vs end), not just what it
// currently is (the color/glow already carries that). The "AI" states use a
// sparkles mark (matches the assistant's brand art) rather than a mic.
const STATUS_ICON: Record<VoiceSessionStatus, keyof typeof Ionicons.glyphMap> = {
  idle: 'sparkles-outline', // not connected — tap to connect
  connecting: 'sparkles', // connecting — solid mark, glow's pulse carries "in progress"
  connected: 'sparkles', // connected — the breathing/beat carries "live"; tap to disconnect
  error: 'refresh', // failed — tap to retry
}

// `centerX`/`barWidth` are in the tab bar's own local coordinate space —
// this button is a sibling of the bar's (non-clipped) outer container, so
// its `left` is relative to that same box.
export function AssistantTabButton({
  centerX,
  barWidth,
  labelColor,
  labelTop,
}: {
  centerX: number
  barWidth: number
  labelColor: string
  /** Vertical position (relative to the same non-clipped bar container the
   *  button itself is positioned in) that lands the "Trợ lý" caption at the
   *  same baseline as the bar's other tab labels — differs between the
   *  native and web tab bars' own content heights, so each caller computes
   *  its own value instead of this component assuming one. */
  labelTop: number
}) {
  const voice = useVoiceSessionStore()
  const chats = useAssistantChatStore(s => s.chats)
  const { data: driver } = useCurrentUser()
  const pathname = usePathname()

  // Home already shows the full scrolling chat log itself — the popup text
  // card would just duplicate what's already on screen there.
  const isHome = pathname === '/'

  const [expandedText, setExpandedText] = useState<string | null>(null)
  const [cardHeight, setCardHeight] = useState(80)
  const lastChatCountRef = useRef(chats.length)
  const collapseTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pulse = useSharedValue(0)
  // `phase`: seamless 0→2π clock driving the gentle circular breathing.
  // `level`: frame-smoothed AI voice loudness driving the speaker "beat".
  // `targetLevel`: raw beat target the frame loop chases. `enter`: 0→1 settle
  // replayed on every status change so colour/shape swaps never hard-cut.
  const phase = useSharedValue(0)
  const level = useSharedValue(0)
  const targetLevel = useSharedValue(0)
  const enter = useSharedValue(1)

  // Honour the OS "reduce motion" switch — no looping breathing / beat /
  // pulse; the button then only changes colour + icon per state.
  const [reduceMotion, setReduceMotion] = useState(false)
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion)
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion)
    return () => sub.remove()
  }, [])

  // Only the fully-connected state animates; "connecting" stays a still disc
  // (the glow's fast pulse already signals "working").
  const rippleOn = voice.status === 'connected' && !reduceMotion
  const beatOn = voice.status === 'connected' && !reduceMotion

  // Upsample LiveKit's ~5 Hz agentAudioLevel to 60 fps: chase the target each
  // frame with a snappy attack / quicker release, so the orb pumps once per
  // word of the AI's speech.
  const frame = useFrameCallback(() => {
    'worklet'
    const t = targetLevel.value
    const l = level.value
    const k = t > l ? 0.6 : 0.14
    const next = l + (t - l) * k
    level.value = Math.abs(next - t) < 0.001 ? t : next
  }, false)

  const handlePress = () => {
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

  // Drives the glow ring's pulse rate/style from call status — briskly for
  // "connecting" (visibly working), a slow breathe for "connected" (calm,
  // still alive), settled/still for idle and error.
  useEffect(() => {
    if (reduceMotion) {
      cancelAnimation(pulse)
      pulse.value = withTiming(0.3, { duration: 200 })
      return
    }
    const duration = PULSE_DURATION[voice.status]
    if (duration > 0) {
      pulse.value = withRepeat(withSequence(withTiming(1, { duration }), withTiming(0, { duration })), -1, true)
    } else {
      pulse.value = withTiming(0.3, { duration: 400 })
    }
  }, [voice.status, pulse, reduceMotion])

  // Start/stop the gentle circular breathing with the connected state.
  useEffect(() => {
    if (rippleOn) {
      phase.value = withRepeat(withTiming(Math.PI * 2, { duration: 7000, easing: Easing.linear }), -1, false)
    } else {
      cancelAnimation(phase)
      phase.value = 0
    }
  }, [rippleOn, phase])

  // Short opacity/scale settle on every status change — perceptually a soft
  // cross-fade so the colour + shape swap never reads as a hard flip.
  useEffect(() => {
    if (reduceMotion) {
      enter.value = 1
      return
    }
    enter.value = 0
    enter.value = withTiming(1, { duration: 240, easing: Easing.out(Easing.quad) })
  }, [voice.status, enter, reduceMotion])

  // Hand the (amplified, clamped) beat target to the frame loop; it does the
  // smoothing. Run the loop only while it can move.
  useEffect(() => {
    targetLevel.value = beatOn ? Math.min(1, voice.agentAudioLevel * 2.4) : 0
  }, [voice.agentAudioLevel, beatOn, targetLevel])

  useEffect(() => {
    frame.setActive(beatOn)
    if (!beatOn) level.value = withTiming(0, { duration: 250 })
  }, [beatOn, frame, level])

  // Pops the AI's latest reply up as a text card while off the Home tab
  // (Home already shows the full chat), then auto-collapses.
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

  useEffect(() => () => {
    if (collapseTimer.current) clearTimeout(collapseTimer.current)
  }, [])

  const glowStyle = useAnimatedStyle(() => ({
    opacity: (0.25 + pulse.value * 0.45 + level.value * 0.16) * (0.6 + 0.4 * enter.value),
    transform: [{ scale: 0.85 + pulse.value * 0.25 + level.value * 0.2 }],
  }))

  // The disc outline: a gentle, constant circular breathing — its amplitude
  // does NOT track the voice (the speaker "beat" below carries that).
  const orbPathProps = useAnimatedProps(() => {
    const amp = 0.6 + 0.1 * Math.sin(phase.value)
    return { d: buildOrbPath(phase.value, amp) }
  })

  // While the AI talks the whole orb pumps like a speaker cone, once per word
  // (~+12% max). The `enter` term folds in the status-change settle.
  const orbBeatStyle = useAnimatedStyle(() => ({
    opacity: 0.7 + 0.3 * enter.value,
    transform: [{ scale: (0.985 + 0.015 * enter.value) * (1 + Math.min(0.12, level.value * 0.16)) }],
  }))

  if (barWidth <= 0) return null

  const left = centerX - BUTTON_SIZE / 2
  const cardLeft = Math.min(Math.max(centerX - CARD_WIDTH / 2, CARD_MARGIN), barWidth - CARD_WIDTH - CARD_MARGIN)
  const [bright, mid, dark] = STATUS_GRADIENT[voice.status]
  const glowColor = STATUS_GLOW_COLOR[voice.status]

  return (
    <>
      {expandedText ? (
        <View
          style={[styles.cardWrap, { left: cardLeft, top: -BUTTON_RISE - cardHeight - 12 }]}
          onLayout={(e: LayoutChangeEvent) => setCardHeight(e.nativeEvent.layout.height)}
          pointerEvents="none"
        >
          <GlassMaterial borderRadius={18}>
            <Text numberOfLines={4} color="$textPrimary" fontSize="$1" padding={10} textAlign="center">
              {expandedText}
            </Text>
          </GlassMaterial>
        </View>
      ) : null}

      <Pressable
        onPress={handlePress}
        accessible
        accessibilityRole="button"
        accessibilityLabel={STATUS_ACCESSIBILITY_LABEL[voice.status]}
        // Lets a screen-reader user activate the button with a double-tap
        // (the standard assistive-tech gesture for "tap") — `onPress` alone
        // already covers a normal touch, this just makes sure VoiceOver/
        // TalkBack's own activation path reaches the same handler.
        onAccessibilityTap={handlePress}
        style={[styles.buttonWrap, { left, top: -BUTTON_RISE }]}
      >
        {/* Soft pulsing halo, centered behind the button — sized bigger than
            the button itself and NOT clipped, so the glow can bleed outward
            instead of getting cut off at the button's own edge. */}
        <Animated.View style={[styles.glow, glowStyle]} pointerEvents="none">
          <Svg width={GLOW_SIZE} height={GLOW_SIZE}>
            <Defs>
              <RadialGradient id="tabAiGlow" cx="50%" cy="50%" r="50%">
                <Stop offset="0%" stopColor={glowColor} stopOpacity={0.55} />
                <Stop offset="60%" stopColor={glowColor} stopOpacity={0.22} />
                <Stop offset="100%" stopColor={glowColor} stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Circle cx="50%" cy="50%" r="50%" fill="url(#tabAiGlow)" />
          </Svg>
        </Animated.View>

        <Animated.View style={[styles.buttonClip, orbBeatStyle]}>
          <Svg width={ORB_BOX} height={ORB_BOX} style={styles.orbSvg}>
            <Defs>
              <RadialGradient id="tabAiFill" cx="35%" cy="30%" r="75%">
                <Stop offset="0%" stopColor={bright} />
                <Stop offset="55%" stopColor={mid} />
                <Stop offset="100%" stopColor={dark} />
              </RadialGradient>
            </Defs>
            {rippleOn ? (
              <>
                {/* Opaque backing, gradient fill and rim all trace the SAME
                    breathing outline — the button's edge is what moves. The
                    opaque backing keeps the disc readable on any theme. */}
                <AnimatedPath animatedProps={orbPathProps} fill="#0f0720" />
                <AnimatedPath animatedProps={orbPathProps} fill="url(#tabAiFill)" />
                <AnimatedPath
                  animatedProps={orbPathProps}
                  fill="none"
                  stroke="rgba(255,255,255,0.25)"
                  strokeWidth={1}
                />
              </>
            ) : (
              <>
                <Circle cx={ORB_C} cy={ORB_C} r={ORB_BASE_R} fill="#0f0720" />
                <Circle cx={ORB_C} cy={ORB_C} r={ORB_BASE_R} fill="url(#tabAiFill)" />
                <Circle
                  cx={ORB_C}
                  cy={ORB_C}
                  r={ORB_BASE_R}
                  fill="none"
                  stroke="rgba(255,255,255,0.25)"
                  strokeWidth={1}
                />
              </>
            )}
          </Svg>
          <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
            <Ionicons name={STATUS_ICON[voice.status]} size={22} color="#ffffff" style={styles.buttonIcon} />
          </View>
        </Animated.View>
      </Pressable>

      <Text
        numberOfLines={1}
        style={[styles.buttonLabel, { left: centerX - 40, top: labelTop, width: 80, color: labelColor }]}
      >
        Trợ lý
      </Text>
    </>
  )
}

const styles = StyleSheet.create({
  buttonWrap: {
    position: 'absolute',
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
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
    left: -(GLOW_SIZE - BUTTON_SIZE) / 2,
    top: -(GLOW_SIZE - BUTTON_SIZE) / 2,
  },
  buttonClip: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // The wave path box is bigger than the button so ripple crests aren't
  // clipped; centre it over the 56pt button.
  orbSvg: {
    position: 'absolute',
    left: (BUTTON_SIZE - ORB_BOX) / 2,
    top: (BUTTON_SIZE - ORB_BOX) / 2,
  },
  buttonIcon: {
    flex: 1,
    textAlign: 'center',
    textAlignVertical: 'center',
  },
  buttonLabel: {
    position: 'absolute',
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    textAlign: 'center',
  },
  cardWrap: { position: 'absolute', width: CARD_WIDTH, zIndex: 59, elevation: 59 },
})
