import { View } from 'tamagui'
import type { VoiceSessionStatus } from '../stores/voiceSessionStore'

// @shopify/react-native-skia needs its own CanvasKit/WASM setup to run on
// web (not automatic with Expo Router web builds) — this simple fallback
// keeps the web preview alive without that setup. The real dot-sphere lives
// in AssistantAvatar.tsx, used on native (Android/iOS) via Metro's platform
// file resolution.
const STATUS_COLOR: Record<VoiceSessionStatus, string> = {
  idle: '#7C5B9C',
  connecting: '#f5a623',
  connected: '#A855F7',
  error: '#e05252',
}

export function AssistantAvatar({ status }: { status: VoiceSessionStatus }) {
  return (
    <View alignItems="center" justifyContent="center" paddingTop="$8">
      <View width={128} height={128} borderRadius={64} backgroundColor={STATUS_COLOR[status]} />
    </View>
  )
}
