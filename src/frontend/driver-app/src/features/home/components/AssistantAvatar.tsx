import { useEffect, useRef } from 'react'
import { Animated, Text, View } from 'react-native'
import type { VoiceSessionStatus } from '../stores/voiceSessionStore'

const STATUS_COLOR: Record<VoiceSessionStatus, string> = {
  idle: '#6c8aff',
  connecting: '#f5a623',
  connected: '#35a4f3',
  error: '#e05252',
}

export function AssistantAvatar({ status }: { status: VoiceSessionStatus }) {
  const pulse = useRef(new Animated.Value(1)).current

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
    <View className="items-center justify-center py-8">
      <Animated.View
        style={{ transform: [{ scale: pulse }], backgroundColor: STATUS_COLOR[status] }}
        className="w-28 h-28 rounded-full items-center justify-center"
      >
        <Text className="text-5xl">🤖</Text>
      </Animated.View>
    </View>
  )
}
