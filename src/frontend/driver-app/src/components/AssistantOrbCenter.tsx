/**
 * Mic (idle) ↔ voice wave bars (connected), driven by agentAudioLevel.
 */
import { useEffect } from 'react'
import { Platform, StyleSheet, View } from 'react-native'
import Animated, {
  cancelAnimation,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated'
import { Ionicons } from '@expo/vector-icons'
import { useVoiceSessionStore, type VoiceSessionStatus } from '../features/home/stores/voiceSessionStore'
import { useAppForeground } from '../hooks/useAppForeground'

const BAR_COUNT = 5
const BAR_WIDTH = 3
const BAR_GAP = 3
const BAR_MIN = 5
const BAR_MAX = 20
const BAR_WEIGHT = [0.72, 1, 0.88, 0.95, 0.78]

function useBarHeights() {
  const h0 = useSharedValue(BAR_MIN)
  const h1 = useSharedValue(BAR_MIN)
  const h2 = useSharedValue(BAR_MIN)
  const h3 = useSharedValue(BAR_MIN)
  const h4 = useSharedValue(BAR_MIN)
  return [h0, h1, h2, h3, h4] as const
}

function VoiceWaveBars({ color, reduceMotion }: { color: string; reduceMotion: boolean }) {
  const level = useVoiceSessionStore(s => s.agentAudioLevel)
  const speaking = useVoiceSessionStore(s => s.agentSpeaking)
  const appForeground = useAppForeground()
  const idle = useSharedValue(0)
  const heights = useBarHeights()

  useEffect(() => {
    if (!appForeground || reduceMotion) {
      cancelAnimation(idle)
      idle.value = 0
      const base = Math.min(1, level * 2.2)
      heights.forEach((h, i) => {
        h.value = BAR_MIN + (BAR_MAX - BAR_MIN) * base * BAR_WEIGHT[i]
      })
      return
    }

    const live = speaking || level > 0.02
    if (live) {
      cancelAnimation(idle)
      idle.value = 0
      const base = Math.min(1, level * 2.4)
      heights.forEach((h, i) => {
        h.value = withTiming(BAR_MIN + (BAR_MAX - BAR_MIN) * base * BAR_WEIGHT[i], { duration: 90 })
      })
      return
    }

    idle.value = withRepeat(
      withSequence(withTiming(1, { duration: 900 }), withTiming(0, { duration: 900 })),
      -1,
      true,
    )
  }, [level, speaking, reduceMotion, idle, heights, appForeground])

  const live = speaking || level > 0.02

  return (
    <View style={styles.waveRow} pointerEvents="none">
      {heights.map((h, i) => (
        <WaveBar key={i} height={h} idle={idle} index={i} live={live} color={color} />
      ))}
    </View>
  )
}

function WaveBar({
  height,
  idle,
  index,
  live,
  color,
}: {
  height: SharedValue<number>
  idle: SharedValue<number>
  index: number
  live: boolean
  color: string
}) {
  const barStyle = useAnimatedStyle(() => {
    const idleBoost = live ? 0 : idle.value * 4 * BAR_WEIGHT[index]
    return {
      height: height.value + idleBoost,
      width: BAR_WIDTH,
      borderRadius: BAR_WIDTH,
      backgroundColor: color,
      opacity: 0.92,
    }
  })

  return <Animated.View style={barStyle} />
}

function PulsingMic({ color }: { color: string }) {
  const pulse = useSharedValue(1)
  const appForeground = useAppForeground()

  useEffect(() => {
    if (!appForeground) {
      cancelAnimation(pulse)
      pulse.value = 1
      return
    }
    pulse.value = withRepeat(withSequence(withTiming(0.55, { duration: 480 }), withTiming(1, { duration: 480 })), -1, true)
    return () => cancelAnimation(pulse)
  }, [pulse, appForeground])

  const style = useAnimatedStyle(() => ({ opacity: pulse.value }))

  return (
    <Animated.View style={style}>
      <Ionicons name="mic" size={22} color={color} />
    </Animated.View>
  )
}

function PulsingMicWeb({ color }: { color: string }) {
  return (
    <View style={{ animation: 'assistantMicPulse 0.96s ease-in-out infinite' } as object}>
      <Ionicons name="mic" size={22} color={color} />
    </View>
  )
}

function VoiceWaveBarsWeb({ color }: { color: string }) {
  return (
    <View style={styles.waveRow} pointerEvents="none">
      {BAR_WEIGHT.map((w, i) => (
        <View
          key={i}
          style={
            {
              width: BAR_WIDTH,
              borderRadius: BAR_WIDTH,
              backgroundColor: color,
              opacity: 0.92,
              animation: `assistantWave${i} 1.${4 + i}s ease-in-out infinite`,
            } as object
          }
        />
      ))}
    </View>
  )
}

const WAVE_STYLE_ID = 'assistant-wave-keyframes'

function ensureWaveKeyframes() {
  if (typeof document === 'undefined') return
  if (document.getElementById(WAVE_STYLE_ID)) return
  const rules = BAR_WEIGHT.map((w, i) => {
    const max = Math.round(BAR_MIN + (BAR_MAX - BAR_MIN) * w)
    return `@keyframes assistantWave${i} {
      0%, 100% { height: ${BAR_MIN}px; }
      50% { height: ${max}px; }
    }`
  }).join('\n')
  const el = document.createElement('style')
  el.id = WAVE_STYLE_ID
  el.textContent =
    rules +
    `\n@keyframes assistantMicPulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.55; }
    }`
  document.head.appendChild(el)
}

function ConnectedCenter({ iconColor, reduceMotion }: { iconColor: string; reduceMotion: boolean }) {
  return (
    <View style={styles.center} pointerEvents="none">
      {Platform.OS === 'web' ? (
        <VoiceWaveBarsWeb color={iconColor} />
      ) : (
        <VoiceWaveBars color={iconColor} reduceMotion={reduceMotion} />
      )}
    </View>
  )
}

export function AssistantOrbCenter({
  status,
  iconColor,
  reduceMotion = false,
}: {
  status: VoiceSessionStatus
  iconColor: string
  reduceMotion?: boolean
}) {
  useEffect(() => {
    if (Platform.OS === 'web') ensureWaveKeyframes()
  }, [])

  if (status === 'connected') {
    return <ConnectedCenter iconColor={iconColor} reduceMotion={reduceMotion} />
  }

  const iconName = status === 'error' ? 'refresh' : 'mic'

  return (
    <View style={styles.center} pointerEvents="none">
      {status === 'connecting' && !reduceMotion ? (
        Platform.OS === 'web' ? (
          <PulsingMicWeb color={iconColor} />
        ) : (
          <PulsingMic color={iconColor} />
        )
      ) : (
        <Ionicons name={iconName} size={22} color={iconColor} />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  center: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 4,
  },
  waveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: BAR_GAP,
    height: BAR_MAX + 2,
  },
})
