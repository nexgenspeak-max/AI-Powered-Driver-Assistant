import { useEffect } from 'react'
import { router, useLocalSearchParams } from 'expo-router'
import { useVoiceSessionStore } from '../../src/features/home/stores/voiceSessionStore'
import { useAssistantChatStore } from '../../src/features/home/stores/assistantChatStore'

/**
 * DEV-only: send one chat line to Czen through the exact path the composer
 * uses (lk.chat on the live voice session), so demo/QA scripts can ask
 * Vietnamese questions with diacritics — the simulator's HID typing can't.
 *   xcrun simctl openurl booted "driver-app:///(app)/dev-say?text=<urlencoded>"
 * The chat overlay sits above the tab screens, so this empty hidden tab is
 * never seen; it navigates back to the previous tab right away.
 */
export default function DevSayScreen() {
  const { text } = useLocalSearchParams<{ text?: string }>()

  useEffect(() => {
    const line = (Array.isArray(text) ? text[0] : text)?.trim()
    if (__DEV__ && line) {
      const voice = useVoiceSessionStore.getState()
      const chat = useAssistantChatStore.getState()
      if (voice.status === 'connected') {
        chat.upsertStreamingMessage('me', line, true)
        void voice.sendText(line)
      } else {
        chat.addUserMessage(line)
      }
    }
    if (router.canGoBack()) router.back()
    else router.replace('/(app)')
  }, [text])

  return null
}
