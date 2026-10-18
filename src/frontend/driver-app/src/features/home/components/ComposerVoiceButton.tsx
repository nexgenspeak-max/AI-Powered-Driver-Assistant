import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { CzenMark } from '../../../components/CzenMark'
import { useCurrentUser } from '../../auth/hooks/useCurrentUser'
import { useVoiceSessionStore } from '../stores/voiceSessionStore'
import { haptics } from '../../../utils/haptics'

const SIZE = 44
const BRAND = ['#5B21B6', '#7C3AED', '#9F67FA'] as const
// Relative bar heights — a calm "idle listening" shape, scaled up by the
// agent's audio level while it speaks.
const BARS = [0.45, 0.8, 1, 0.65]

/**
 * Voice control inside the chat composer (ChatGPT / Gemini Live pattern):
 * idle → Czen mark (tap to connect), connecting → spinner, connected →
 * live waveform (tap to end the session). Replaces the separate floating
 * orb + "Trợ lý AI" label that used to sit under the composer.
 */
import { confirmCancelCall } from '../lib/cancelCall'

export function ComposerVoiceButton() {
  const status = useVoiceSessionStore(s => s.status)
  const level = useVoiceSessionStore(s => s.agentAudioLevel)
  const speaking = useVoiceSessionStore(s => s.agentSpeaking)
  const isCallActive = useVoiceSessionStore(s => s.isCallActive)
  const connect = useVoiceSessionStore(s => s.connect)
  const disconnect = useVoiceSessionStore(s => s.disconnect)
  const { data: driver } = useCurrentUser()

  const connected = status === 'connected'
  const connecting = status === 'connecting'

  const onPress = () => {
    if (connecting) return
    haptics.selection()
    if (connected) {
      if (isCallActive) {
        confirmCancelCall()
        return
      }
      disconnect({ userInitiated: true })
      return
    }
    if (!driver?.phone) {
      Alert.alert('Lỗi', 'Không tìm thấy số điện thoại tài xế.')
      return
    }
    connect(driver.phone)
  }

  const amp = connected ? 0.35 + (speaking ? Math.min(1, level * 2.2) : 0.15) * 0.65 : 0

  return (
    <Pressable
      onPress={onPress}
      disabled={connecting}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={
        connected ? 'Kết thúc phiên Trợ lý AI' : connecting ? 'Đang kết nối Trợ lý AI' : 'Bắt đầu nói với Trợ lý AI'
      }
      accessibilityState={{ busy: connecting, disabled: connecting }}
      style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.94 : 1 }] }]}
    >
      <LinearGradient colors={[...BRAND]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.circle}>
        {connecting ? (
          <ActivityIndicator size="small" color="#ffffff" />
        ) : connected ? (
          <View style={styles.bars} pointerEvents="none">
            {BARS.map((h, i) => (
              <View key={i} style={[styles.bar, { height: 6 + h * 14 * amp }]} />
            ))}
          </View>
        ) : (
          <CzenMark size={26} />
        )}
      </LinearGradient>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  circle: { width: SIZE, height: SIZE, borderRadius: SIZE / 2, alignItems: 'center', justifyContent: 'center' },
  bars: { flexDirection: 'row', alignItems: 'center', gap: 3, height: 22 },
  bar: { width: 3.5, borderRadius: 2, backgroundColor: '#ffffff' },
})
