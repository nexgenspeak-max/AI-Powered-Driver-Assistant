import { useEffect, useRef, useState } from 'react'
import { View, Text, ScrollView, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useAssistantChatStore } from '../stores/assistantChatStore'
import { useVoiceSessionStore, subscribeVoiceMessages } from '../stores/voiceSessionStore'
import { useAuthStore } from '../../../stores/authStore'
import { getAssistantReply } from '../../../services/api/assistant'
import { AssistantAvatar } from './AssistantAvatar'

const MIC_LABEL = {
  idle: 'Bấm để nói chuyện với AI',
  connecting: 'Đang kết nối...',
  connected: 'Đang trong phiên thoại — bấm để ngắt',
  error: 'Kết nối lỗi, thử lại',
}

export function AssistantChatPanel() {
  const customer = useAuthStore(s => s.customer)
  const { chats, addUserMessage, addBotMessage } = useAssistantChatStore()
  const voice = useVoiceSessionStore()
  const [msg, setMsg] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [stubLoading, setStubLoading] = useState(false)
  const scrollRef = useRef<ScrollView>(null)

  useEffect(() => subscribeVoiceMessages((text, from) => {
    if (from === 'user') addUserMessage(text)
    else addBotMessage(text)
  }), [addUserMessage, addBotMessage])

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true })
  }, [chats])

  const handleSend = async () => {
    if (!msg.trim()) {
      setError('Bạn chưa nhập nội dung.')
      return
    }
    const text = msg
    setMsg('')
    addUserMessage(text)

    if (voice.status === 'connected' && (await voice.sendText(text))) {
      return
    }

    setStubLoading(true)
    try {
      const reply = await getAssistantReply(text)
      addBotMessage(reply)
    } finally {
      setStubLoading(false)
    }
  }

  const handleMicPress = () => {
    if (voice.status === 'connected' || voice.status === 'connecting') {
      voice.disconnect()
      return
    }
    if (!customer?.phone) {
      setError('Không tìm thấy số điện thoại của bạn.')
      return
    }
    voice.connect(customer.phone)
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-dark"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={60}
    >
      <View className="pt-14">
        <AssistantAvatar status={voice.status} />
        <Text className="text-center text-gray-400 text-xs -mt-4">{MIC_LABEL[voice.status]}</Text>
      </View>

      <ScrollView ref={scrollRef} className="flex-1 px-4 mt-4" contentContainerClassName="gap-2 pb-2">
        {chats.map((chat, i) => (
          <View
            key={i}
            className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${chat.who === 'me' ? 'self-end bg-primary' : 'self-start bg-accent'}`}
          >
            <Text className="text-white">{chat.msg}</Text>
          </View>
        ))}
        {stubLoading && <Text className="text-gray-400 text-xs px-1">Đang trả lời...</Text>}
        {error && <Text className="text-red-400 text-xs px-1">{error}</Text>}
      </ScrollView>

      <View className="flex-row items-center gap-2 mx-4 mb-6 px-2 h-12 rounded-full border border-gray-600 bg-gray-900">
        <TouchableOpacity onPress={handleMicPress} className="p-2">
          <Ionicons
            name="mic"
            size={20}
            color={voice.status === 'connected' ? '#35a4f3' : voice.status === 'connecting' ? '#f5a623' : voice.status === 'error' ? '#e05252' : '#fff'}
          />
        </TouchableOpacity>
        <TextInput
          value={msg}
          onChangeText={setMsg}
          onSubmitEditing={handleSend}
          placeholder="Nói gì đó..."
          placeholderTextColor="#9ca3af"
          className="flex-1 text-white"
        />
        <TouchableOpacity onPress={handleSend} className="p-2">
          <Ionicons name="send" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}
