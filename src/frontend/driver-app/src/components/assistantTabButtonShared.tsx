/**
 * Shared logic + exports for AssistantTabButton (native + web).
 */
import { useEffect, useRef, useState } from 'react'
import { AccessibilityInfo, Alert, Platform } from 'react-native'
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useFrameCallback,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated'
import { useTheme } from 'tamagui'
import { usePathname } from 'expo-router'
import { useVoiceSessionStore, type VoiceSessionStatus } from '../features/home/stores/voiceSessionStore'
import { useAssistantChatStore } from '../features/home/stores/assistantChatStore'
import { useCurrentUser } from '../features/auth/hooks/useCurrentUser'
import { confirmCancelCall } from '../features/home/lib/cancelCall'
import { useAppForeground } from '../hooks/useAppForeground'

export const ORB_SIZE = 64
export const BUTTON_SIZE = ORB_SIZE
/** Horizontal wrap wider than the orb so “Trợ lý AI” caption fits. */
export const ORB_WRAP_WIDTH = 80
/** How far the docked orb rises above the Navigation Bar's top edge. */
export const BUTTON_RISE = 26
/** Space below the orb for the “Trợ lý AI” caption, when it is shown
 *  (chat dock keeps it; the docked nav-bar orb passes `showLabel={false}`). */
export const BUTTON_LABEL_OVERHANG = 18

export const EXPANDED_TEXT_MS = 4500
export const CARD_WIDTH = 220
export const CARD_MARGIN = 8
export const SPIN_SIZE = Math.ceil(ORB_SIZE * 1.55)

export const PULSE_DURATION: Record<VoiceSessionStatus, number> = {
  idle: 0,
  connecting: 420,
  connected: 1400,
  error: 0,
}
export const SPIN_DURATION: Record<VoiceSessionStatus, number> = {
  idle: 0,
  connecting: 8000,
  connected: 12000,
  error: 0,
}
export const STATUS_ACCESSIBILITY_LABEL: Record<VoiceSessionStatus, string> = {
  idle: 'Trợ lý AI, đang tắt. Nhấn để bắt đầu hội thoại.',
  connecting: 'Trợ lý AI đang kết nối, vui lòng chờ.',
  connected: 'Trợ lý AI, đang bật. Nhấn để kết thúc phiên.',
  error: 'Trợ lý AI, đã xảy ra lỗi. Nhấn để thử lại.',
}

/** Brand-purple orb gradients (primary #8B5CF6 / #7C3AED). */
export const ORB_LAYER_A: [string, string, string, string] = ['#7C3AED', '#8B5CF6', '#A855F7', '#C4B5FD']
export const ORB_LAYER_B: [string, string, string, string] = ['#6D28D9', '#9333EA', '#A855F7', '#DDD6FE']
export const ORB_LOCATIONS: [number, number, number, number] = [0, 0.34, 0.68, 1]

/** @deprecated use ORB_LAYER_A */
export const SIRI_LAYER_A = ORB_LAYER_A
/** @deprecated use ORB_LAYER_B */
export const SIRI_LAYER_B = ORB_LAYER_B
/** @deprecated use ORB_LOCATIONS */
export const SIRI_LOCATIONS = ORB_LOCATIONS

export const ORB_CONIC_A =
  'conic-gradient(from 0deg, #7C3AED 0deg, #8B5CF6 90deg, #A855F7 180deg, #C4B5FD 270deg, #7C3AED 360deg)'
export const ORB_CONIC_B =
  'conic-gradient(from 180deg, #6D28D9 0deg, #9333EA 120deg, #A855F7 240deg, #6D28D9 360deg)'

/** @deprecated use ORB_CONIC_A */
export const SIRI_CONIC_A = ORB_CONIC_A
/** @deprecated use ORB_CONIC_B */
export const SIRI_CONIC_B = ORB_CONIC_B

export function useAssistantTabButton() {
  const theme = useTheme()
  const voice = useVoiceSessionStore()
  const chats = useAssistantChatStore(s => s.chats)
  const panelOpen = useAssistantChatStore(s => s.panelOpen)
  const { data: driver } = useCurrentUser()
  const pathname = usePathname()
  const isHome = pathname === '/'
  const appForeground = useAppForeground()

  const [expandedText, setExpandedText] = useState<string | null>(null)
  const [cardHeight, setCardHeight] = useState(80)
  const lastChatCountRef = useRef(chats.length)
  const collapseTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pulse = useSharedValue(0)
  const spin = useSharedValue(0)
  const spinB = useSharedValue(0)
  const breathe = useSharedValue(0)
  const level = useSharedValue(0)
  const targetLevel = useSharedValue(0)
  const enter = useSharedValue(1)

  const [reduceMotion, setReduceMotion] = useState(false)
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion)
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion)
    return () => sub.remove()
  }, [])

  const beatOn = voice.status === 'connected' && !reduceMotion && appForeground
  const motionOn = voice.status !== 'error' && !reduceMotion && appForeground
  const connectedMuted = voice.status === 'connected' && voice.isMicMuted
  const isConnecting = voice.status === 'connecting'

  const frame = useFrameCallback(() => {
    'worklet'
    const t = targetLevel.value
    const l = level.value
    const k = t > l ? 0.6 : 0.14
    const next = l + (t - l) * k
    level.value = Math.abs(next - t) < 0.001 ? t : next
  }, false)

  /**
   * Simple flow:
   * - connecting → button disabled until handshake finishes
   * - connected + chat minimized → open chat
   * - connected + chat open → hang up
   * - not connected (idle/error) → open chat + connect / reconnect
   */
  const handlePress = () => {
    if (isConnecting) return
    if (voice.status === 'connected') {
      if (!useAssistantChatStore.getState().panelOpen) {
        useAssistantChatStore.getState().openPanel()
        return
      }
      if (voice.isCallActive) {
        confirmCancelCall()
        return
      }
      voice.disconnect({ userInitiated: true })
      return
    }
    if (!driver?.phone) {
      Alert.alert('Lỗi', 'Không tìm thấy số điện thoại tài xế.')
      return
    }
    useAssistantChatStore.getState().openPanel()
    voice.connect(driver.phone)
  }

  useEffect(() => {
    if (Platform.OS === 'web') return
    if (reduceMotion) {
      cancelAnimation(pulse)
      pulse.value = withTiming(0.15, { duration: 200 })
      return
    }
    const duration = PULSE_DURATION[voice.status]
    if (duration > 0) {
      pulse.value = withRepeat(withSequence(withTiming(1, { duration }), withTiming(0, { duration })), -1, true)
    } else {
      pulse.value = withTiming(0, { duration: 300 })
    }
  }, [voice.status, pulse, reduceMotion, appForeground])

  useEffect(() => {
    if (Platform.OS === 'web') {
      cancelAnimation(spin)
      cancelAnimation(spinB)
      return
    }
    const shouldSpin = motionOn && voice.status !== 'idle'
    if (!shouldSpin) {
      cancelAnimation(spin)
      cancelAnimation(spinB)
      spin.value = withTiming(0, { duration: 300 })
      spinB.value = withTiming(0, { duration: 300 })
      return
    }
    const duration = SPIN_DURATION[voice.status] || 10000
    spin.value = 0
    spin.value = withRepeat(withTiming(360, { duration, easing: Easing.linear }), -1, false)
    spinB.value = 0
    spinB.value = withRepeat(withTiming(-360, { duration: duration * 1.35, easing: Easing.linear }), -1, false)
  }, [voice.status, spin, spinB, motionOn, appForeground])

  useEffect(() => {
    if (reduceMotion || voice.status !== 'idle' || Platform.OS === 'web' || !appForeground) {
      cancelAnimation(breathe)
      breathe.value = withTiming(0, { duration: 300 })
      return
    }
    breathe.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 2600, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      true,
    )
  }, [voice.status, breathe, reduceMotion, appForeground])

  useEffect(() => {
    if (reduceMotion) {
      enter.value = 1
      return
    }
    enter.value = 0
    enter.value = withTiming(1, { duration: 220, easing: Easing.out(Easing.quad) })
  }, [voice.status, enter, reduceMotion])

  useEffect(() => {
    const next = beatOn ? Math.min(1, voice.agentAudioLevel * 2.4) : 0
    targetLevel.value = next
    if (Platform.OS === 'web') level.value = next
  }, [voice.agentAudioLevel, beatOn, targetLevel, level])

  useEffect(() => {
    frame.setActive(beatOn && Platform.OS !== 'web')
    if (!beatOn) level.value = withTiming(0, { duration: 250 })
  }, [beatOn, frame, level])

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

  const orbStyle = useAnimatedStyle(() => {
    if (Platform.OS === 'web') {
      return { transform: [{ scale: 1 }] }
    }
    return {
      transform: [
        {
          scale:
            (0.97 + 0.03 * enter.value + breathe.value * 0.028) *
            (1 + (voice.status === 'connected' ? Math.min(0.07, level.value * 0.1) : 0)),
        },
      ],
    }
  })

  const bloomStyle = useAnimatedStyle(() => {
    if (Platform.OS === 'web') {
      return { opacity: 0, transform: [{ scale: 1 }] }
    }
    return {
      opacity: 0.55 + breathe.value * 0.2 + (voice.status === 'connected' || voice.status === 'connecting' ? pulse.value * 0.25 : 0),
      transform: [{ scale: 1.02 + breathe.value * 0.06 + pulse.value * 0.05 }],
    }
  })

  const ringStyle = useAnimatedStyle(() => {
    if (Platform.OS === 'web') {
      return { opacity: 0, transform: [{ scale: 1 }] }
    }
    return {
      opacity: voice.status === 'connected' || voice.status === 'connecting' ? 0.2 + pulse.value * 0.45 : 0,
      transform: [{ scale: 1 + pulse.value * 0.12 }],
    }
  })

  const spinStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spin.value}deg` }],
  }))

  const spinBStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spinB.value}deg` }],
  }))

  const accessibilityLabel = connectedMuted
    ? 'Trợ lý AI đang kết nối, micro tắt. Nhấn để kết thúc phiên.'
    : voice.status === 'connected' && !panelOpen
      ? 'Trợ lý AI đang kết nối. Nhấn để mở lại hội thoại.'
      : STATUS_ACCESSIBILITY_LABEL[voice.status]

  // Always brand-purple orb + mic (see AssistantOrbCenter) — no isError red/refresh.
  return {
    theme,
    voice,
    expandedText,
    cardHeight,
    setCardHeight,
    handlePress,
    accessibilityLabel,
    reduceMotion,
    connectedMuted,
    isConnecting,
    orbStyle,
    bloomStyle,
    ringStyle,
    spinStyle,
    spinBStyle,
  }
}

/** Tab-bar slot label — tints with voice session state. */
export function AssistantTabLabel({ color, connectingColor }: { color: string; connectingColor?: string }) {
  const status = useVoiceSessionStore(s => s.status)
  const pulse = useSharedValue(1)

  useEffect(() => {
    if (Platform.OS === 'web') {
      cancelAnimation(pulse)
      pulse.value = 1
      return
    }
    if (status === 'connecting') {
      pulse.value = withRepeat(withSequence(withTiming(0.45, { duration: 520 }), withTiming(1, { duration: 520 })), -1, true)
    } else {
      cancelAnimation(pulse)
      pulse.value = withTiming(1, { duration: 200 })
    }
  }, [status, pulse])

  const labelStyle = useAnimatedStyle(() => ({
    opacity: status === 'connecting' ? pulse.value : 1,
  }))

  const resolvedColor = status === 'connected' ? color : connectingColor ?? color

  return (
    <Animated.Text
      numberOfLines={1}
      style={[
        {
          fontSize: 12,
          fontFamily: 'Inter_600SemiBold',
          color: resolvedColor,
        },
        labelStyle,
      ]}
    >
      Trợ lý AI
    </Animated.Text>
  )
}
