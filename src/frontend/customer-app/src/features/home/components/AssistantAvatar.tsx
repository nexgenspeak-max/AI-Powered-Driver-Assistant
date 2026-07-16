import { useEffect, useRef } from 'react'
import { Animated } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { View } from 'tamagui'
import type { VoiceSessionStatus } from '../stores/voiceSessionStore'

const STATUS_GRADIENT: Record<VoiceSessionStatus, [string, string]> = {
  idle: ['#7C5B9C', '#A855F7'],
  connecting: ['#f5a623', '#f5722c'],
  connected: ['#35a4f3', '#6c8aff'],
  error: ['#e05252', '#b23a5c'],
}

export function AssistantAvatar({ status }: { status: VoiceSessionStatus }) {
  const pulse = useRef(new Animated.Value(1)).current
  const [from, to] = STATUS_GRADIENT[status]

  useEffect(() => {
    if (status !== 'connected' && status !== 'connecting') {
      pulse.setValue(1)
      return
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.15, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
      ]),
    )
    loop.start()
    return () => loop.stop()
  }, [status, pulse])

  return (
    <View alignItems="center" justifyContent="center" paddingVertical="$8">
      <Animated.View
        style={{
          transform: [{ scale: pulse }],
          width: 128,
          height: 128,
          borderRadius: 64,
          shadowColor: from,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.6,
          shadowRadius: 30,
          elevation: 12,
        }}
      >
        <LinearGradient
          colors={[from, to]}
          start={{ x: 0.15, y: 0.1 }}
          end={{ x: 0.9, y: 0.9 }}
          style={{ width: '100%', height: '100%', borderRadius: 64 }}
        />
      </Animated.View>
    </View>
  )
}
