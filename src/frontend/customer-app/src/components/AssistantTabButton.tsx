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
 * gone; this is its replacement. Duplicated in driver-app/src/components/
 * AssistantTabButton.tsx — the two apps are separate services and may
 * diverge, but start identical.
 *
 * Uses react-native-svg + Reanimated only (no Skia) — same as the orb it
 * replaces, which had no .web.tsx variant and ran fine on web already.
 */

import { useEffect, useRef, useState } from 'react'
import { Alert, LayoutChangeEvent, Pressable, StyleSheet, View } from 'react-native'
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated'
import { Text } from 'tamagui'
import { Ionicons } from '@expo/vector-icons'
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg'
import { usePathname } from 'expo-router'
import { GlassMaterial } from './LiquidGlass'
import { useVoiceSessionStore, type VoiceSessionStatus } from '../features/home/stores/voiceSessionStore'
import { useAssistantChatStore } from '../features/home/stores/assistantChatStore'
import { useCurrentUser } from '../features/auth/hooks/useCurrentUser'

export const BUTTON_SIZE = 56
// How far above the tab bar's top edge the button pokes. Lowered from an
// earlier 0.62 to keep it clear of other overlay content stacked above the
// tab bar (matches the same reduction on driver-app's copy of this file, for
// visual consistency between the two apps).
export const BUTTON_RISE = Math.round(BUTTON_SIZE * 0.4)

const GLOW_SIZE = Math.round(BUTTON_SIZE * 1.6)
const EXPANDED_TEXT_MS = 4500
const CARD_WIDTH = 220
const CARD_MARGIN = 8

// idle's bright/dark ends are the exact brand pair requested — #C084FC /
// #6D28D9 — with a mid stop interpolated between them for the radial fill.
const STATUS_GRADIENT: Record<VoiceSessionStatus, [string, string, string]> = {
  idle: ['#C084FC', '#9333EA', '#6D28D9'],
  connecting: ['#fde68a', '#f59e0b', '#7c2d12'],
  connected: ['#e9d5ff', '#a855f7', '#4c1d95'],
  error: ['#fecaca', '#e05252', '#7f1d1d'],
}
const STATUS_GLOW_COLOR: Record<VoiceSessionStatus, string> = {
  idle: '#9333EA',
  connecting: '#f59e0b',
  connected: '#a855f7',
  error: '#e05252',
}
const PULSE_DURATION: Record<VoiceSessionStatus, number> = {
  idle: 0,
  connecting: 480,
  connected: 1400,
  error: 0,
}

// Screen-reader label for the button, mirroring AssistantChatPanel's
// MIC_LABEL text so both surfaces describe the same voice.status consistently.
const STATUS_ACCESSIBILITY_LABEL: Record<VoiceSessionStatus, string> = {
  idle: 'Trợ lý giọng nói. Chạm hai lần để kết nối.',
  connecting: 'Trợ lý giọng nói đang kết nối.',
  connected: 'Trợ lý giọng nói đang hoạt động. Chạm hai lần để ngắt kết nối.',
  error: 'Trợ lý giọng nói gặp lỗi kết nối. Chạm hai lần để thử lại.',
}
// Icon swaps with connection state instead of a fixed mic glyph — makes
// what tapping the button will DO explicit (start vs end), not just what
// it currently is (the color/glow already carries that).
const STATUS_ICON: Record<VoiceSessionStatus, keyof typeof Ionicons.glyphMap> = {
  idle: 'mic-outline', // not connected — tap to connect
  connecting: 'mic', // connecting — solid mic, glow's pulse carries "in progress"
  connected: 'close', // connected — tap to disconnect
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
  const { data: customer } = useCurrentUser()
  const pathname = usePathname()

  // Home already shows the full scrolling chat log itself — the popup text
  // card would just duplicate what's already on screen there.
  const isHome = pathname === '/'

  const [expandedText, setExpandedText] = useState<string | null>(null)
  const [cardHeight, setCardHeight] = useState(80)
  const lastChatCountRef = useRef(chats.length)
  const collapseTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pulse = useSharedValue(0)

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
    if (!customer?.phone) {
      Alert.alert('Lỗi', 'Không tìm thấy số điện thoại của bạn.')
      return
    }
    voice.connect(customer.phone)
  }

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
    opacity: 0.25 + pulse.value * 0.45,
    transform: [{ scale: 0.85 + pulse.value * 0.25 }],
  }))

  if (barWidth <= 0) return null

  const left = centerX - BUTTON_SIZE / 2
  const cardLeft = Math.min(Math.max(centerX - CARD_WIDTH / 2, CARD_MARGIN), barWidth - CARD_WIDTH - CARD_MARGIN)
  const [bright, mid, dark] = STATUS_GRADIENT[voice.status]
  const glowColor = STATUS_GLOW_COLOR[voice.status]
  const accessibilityLabel =
    voice.status === 'connected' && voice.isCallActive
      ? 'Trợ lý giọng nói đang trong cuộc gọi. Không thể ngắt lúc này.'
      : STATUS_ACCESSIBILITY_LABEL[voice.status]

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
        accessibilityLabel={accessibilityLabel}
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

        <View style={styles.buttonClip}>
          {/* Opaque dark backing — guarantees the gradient disc above it
              reads clearly regardless of what's behind the button or which
              app theme is active. */}
          <View style={[StyleSheet.absoluteFillObject, styles.buttonBacking]} />
          <Svg width={BUTTON_SIZE} height={BUTTON_SIZE} style={StyleSheet.absoluteFill}>
            <Defs>
              <RadialGradient id="tabAiFill" cx="35%" cy="30%" r="75%">
                <Stop offset="0%" stopColor={bright} />
                <Stop offset="55%" stopColor={mid} />
                <Stop offset="100%" stopColor={dark} />
              </RadialGradient>
            </Defs>
            <Circle cx="50%" cy="50%" r="50%" fill="url(#tabAiFill)" />
          </Svg>
          <View style={[StyleSheet.absoluteFillObject, styles.buttonRim]} pointerEvents="none" />
          <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
            <Ionicons name={STATUS_ICON[voice.status]} size={22} color="#ffffff" style={styles.buttonIcon} />
          </View>
        </View>
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
    borderRadius: BUTTON_SIZE / 2,
    overflow: 'hidden',
  },
  buttonBacking: {
    backgroundColor: '#0f0720',
  },
  buttonRim: {
    borderRadius: BUTTON_SIZE / 2,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
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
