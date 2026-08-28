import { useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { CustomerMap } from '../../src/features/home/components/CustomerMap'
import { ChatToggleButton } from '../../src/features/home/components/ChatToggleButton'
import { AssistantChatPanel } from '../../src/features/home/components/AssistantChatPanel'

export default function HomeScreen() {
  const [chatOpen, setChatOpen] = useState(false)

  return (
    <View style={{ flex: 1 }}>
      <CustomerMap />
      {!chatOpen && <ChatToggleButton onPress={() => setChatOpen(true)} />}
      {chatOpen && (
        <View style={StyleSheet.absoluteFill}>
          <AssistantChatPanel onClose={() => setChatOpen(false)} />
        </View>
      )}
    </View>
  )
}
