import { Alert } from 'react-native'
import { useVoiceSessionStore } from '../stores/voiceSessionStore'
import { useAssistantChatStore } from '../stores/assistantChatStore'

// The agent listens to the customer's line during an AI call, so neither a
// spoken nor a typed "thôi" reached it and this button only said "Không thể
// tắt". The cancel rides its own data topic (backend processors/call_cancel.py).
export const CANCEL_CALL_TEXT = 'Huỷ cuộc gọi'

export function confirmCancelCall(): void {
  Alert.alert('Đang gọi khách', 'Bạn muốn huỷ cuộc gọi này?', [
    { text: 'Tiếp tục gọi', style: 'cancel' },
    {
      text: 'Huỷ cuộc gọi',
      style: 'destructive',
      onPress: () => {
        useAssistantChatStore.getState().upsertStreamingMessage('me', CANCEL_CALL_TEXT, true)
        void useVoiceSessionStore.getState().cancelCall()
      },
    },
  ])
}
