import { useEffect } from 'react'
import { useAssistantChatStore } from '../stores/assistantChatStore'
import { subscribeVoiceMessages } from '../stores/voiceSessionStore'

// Pulled out of AssistantChatPanel so voice transcripts still get recorded
// into the chat history even while that panel isn't mounted (it's now a
// tap-to-open overlay on Home, not the permanent screen content) — without
// this, any conversation happening while the panel is closed would be lost,
// since this listener registration was the only place writing into
// useAssistantChatStore. Mount once at the (app) layout level, same as
// useDispatchSocket/useAutoConnectOnNudge, so it's always active regardless
// of which tab or overlay is showing.
export function useCaptureVoiceMessages(): void {
  const { addUserMessage, addBotMessage } = useAssistantChatStore()

  useEffect(
    () =>
      subscribeVoiceMessages((text, from) => {
        if (from === 'user') addUserMessage(text)
        else addBotMessage(text)
      }),
    [addUserMessage, addBotMessage],
  )
}
