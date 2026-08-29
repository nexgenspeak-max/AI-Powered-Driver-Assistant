import { View } from 'react-native'
import { DriverMap } from '../../src/features/home/components/DriverMap'
import { ChatToggleButton } from '../../src/features/home/components/ChatToggleButton'
import { useAssistantChatStore } from '../../src/features/home/stores/assistantChatStore'
import { useVoiceSessionStore } from '../../src/features/home/stores/voiceSessionStore'
import { useCurrentUser } from '../../src/features/auth/hooks/useCurrentUser'

export default function HomeScreen() {
  const panelOpen = useAssistantChatStore(s => s.panelOpen)
  const openPanel = useAssistantChatStore(s => s.openPanel)
  const voiceStatus = useVoiceSessionStore(s => s.status)
  const connect = useVoiceSessionStore(s => s.connect)
  const { data: driver } = useCurrentUser()

  const handleOpenChat = () => {
    openPanel()
    if (voiceStatus === 'idle' && driver?.phone) {
      connect(driver.phone)
    }
  }

  return (
    <View style={{ flex: 1 }}>
      <DriverMap />
      {!panelOpen && <ChatToggleButton onPress={handleOpenChat} />}
    </View>
  )
}
