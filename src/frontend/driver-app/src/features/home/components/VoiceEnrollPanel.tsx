import { useEffect, useRef } from 'react'
import { Text, YStack, useThemeName } from 'tamagui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { GlassSurface } from '../../../components/GlassSurface'
import { GlassButton } from '../../../components/GlassButton'
import { useVoiceSessionStore } from '../stores/voiceSessionStore'
import { voiceService } from '../../../services/api/voice'

const STATUS_TEXT: Record<string, string> = {
  idle: 'Nhấn "Bắt đầu" và đọc theo trợ lý — cần lặp lại 4 câu ngắn để ghi nhận giọng nói chính xác hơn.',
  connecting: 'Đang kết nối...',
  connected: 'Đang lắng nghe — hãy đọc theo câu trợ lý vừa đọc.',
  error: 'Có lỗi xảy ra, vui lòng thử lại.',
}

// "Bắt đầu" keeps this specific gradient in both themes (the purple-CTA
// exception — see GlassButton's `colors` prop) rather than GlassButton's
// default #8B5CF6->#C084FC, per this screen's own spec.
const CTA_GRADIENT = ['#6D28D9', '#A855F7'] as const

interface Props {
  phone: string
  accountId: string
  /** Fires once the enrollment LiveKit session ends, with whether a voiceprint now exists server-side. */
  onDone: (success: boolean) => void
  /** Bottom-sheet presentation — rounded top corners only, flush to the
   *  screen's bottom edge (including its own safe-area padding). Defaults
   *  to a normal fully-rounded card, which is what AssistantChatPanel's
   *  inline embedding wants (it's one card among others there, not
   *  anchored to the screen edge). */
  sheet?: boolean
}

/** Shared enrollment UI — embedded inline in AssistantChatPanel (mandatory first-time gate)
 * and in a Profile modal (voluntary re-registration). No dedicated route/page. */
export function VoiceEnrollPanel({ phone, accountId, onDone, sheet }: Props) {
  const status = useVoiceSessionStore(s => s.status)
  const enroll = useVoiceSessionStore(s => s.enroll)
  const wasConnected = useRef(false)
  // $textPrimary is already near-black/near-white per theme, but this
  // title needs a firmer black in light mode specifically than the token
  // gives (same reasoning as before this became a GlassSurface card).
  const isLight = useThemeName() === 'light'
  const insets = useSafeAreaInsets()

  useEffect(() => {
    if (status === 'connected') wasConnected.current = true
    if (status === 'idle' && wasConnected.current) {
      wasConnected.current = false
      voiceService.checkVoiceprint(accountId).then(onDone)
    }
  }, [status, accountId, onDone])

  return (
    <GlassSurface
      cornerRadius={sheet ? 28 : 20}
      bottomCornerRadius={sheet ? 0 : undefined}
      style={{ width: '100%' }}
      outline
    >
      <YStack gap="$4" padding="$5" paddingBottom={sheet ? insets.bottom + 20 : undefined}>
        <YStack gap="$2">
          <Text color={isLight ? '#000000' : '#ffffff'} fontSize={18} fontWeight="700">
            Đăng ký giọng nói
          </Text>
          <Text color="$textSecondary" fontSize={13} lineHeight={19}>
            {STATUS_TEXT[status] ?? STATUS_TEXT.idle}
          </Text>
        </YStack>
        <GlassButton
          label={status === 'connected' || status === 'connecting' ? 'Đang đăng ký...' : 'Bắt đầu'}
          onPress={() => enroll(phone)}
          disabled={status === 'connected' || status === 'connecting'}
          loading={status === 'connecting'}
          colors={CTA_GRADIENT}
        />
      </YStack>
    </GlassSurface>
  )
}
