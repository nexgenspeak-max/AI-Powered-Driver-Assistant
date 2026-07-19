import { useEffect, useRef, useState } from 'react'
import { ScrollView, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native'
import { View, XStack, Text, Theme } from 'tamagui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { GlassSheen } from '../../../components/LiquidGlass'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { StatusBar } from 'expo-status-bar'
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
  const insets = useSafeAreaInsets()

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
    // Chat screen is always dark-branded regardless of the app-wide light/dark
    // toggle (matches the signature AI-orb look) — force the dark theme here
    // so $textPrimary/$accent/etc. don't flip to light-mode values against
    // this screen's fixed near-black background.
    <Theme name="dark">
    <StatusBar style="light" />
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#1A1420' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={60}
    >
      <View width="100%" paddingTop={insets.top}>
        <AssistantAvatar status={voice.status} />
        <Text textAlign="center" color="$textSecondary" fontSize="$1" marginTop="$2">
          {MIC_LABEL[voice.status]}
        </Text>
      </View>

      <ScrollView
        ref={scrollRef}
        style={{ flex: 1, paddingHorizontal: 20, marginTop: 16 }}
        contentContainerStyle={{ gap: 8, paddingBottom: 8 }}
      >
        {chats.map((chat, i) =>
          chat.who === 'me' ? (
            <View key={i} maxWidth="80%" alignSelf="flex-end" borderRadius="$bubble" overflow="hidden">
              <LinearGradient
                colors={['#7C5B9C', '#A855F7']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ paddingHorizontal: 16, paddingVertical: 10 }}
              >
                <Text color="$textInverse">{chat.msg}</Text>
              </LinearGradient>
            </View>
          ) : (
            <View
              key={i}
              maxWidth="80%"
              alignSelf="flex-start"
              backgroundColor="$accent"
              borderRadius="$bubble"
              paddingHorizontal={16}
              paddingVertical={10}
            >
              <Text color="$textPrimary">{chat.msg}</Text>
            </View>
          ),
        )}
        {stubLoading && (
          <Text color="$textSecondary" fontSize="$1" paddingHorizontal="$1">
            Đang trả lời...
          </Text>
        )}
        {error && (
          <Text color="$danger" fontSize="$1" paddingHorizontal="$1">
            {error}
          </Text>
        )}
      </ScrollView>

      <XStack
        alignItems="center"
        gap="$2"
        marginHorizontal={20}
        marginBottom={100}
        paddingHorizontal="$2"
        height={48}
        borderRadius="$pill"
        backgroundColor="$surfaceElevated"
        shadowColor="#000"
        shadowOffset={{ width: 0, height: 2 }}
        shadowOpacity={0.3}
        shadowRadius={8}
      >
        <GlassSheen borderRadius={24} />
        <TouchableOpacity onPress={handleMicPress} style={{ padding: 8 }}>
          <Ionicons
            name="mic"
            size={20}
            color={
              voice.status === 'connected'
                ? '#35a4f3'
                : voice.status === 'connecting'
                  ? '#f5a623'
                  : voice.status === 'error'
                    ? '#e05252'
                    : '#fff'
            }
          />
        </TouchableOpacity>
        <TextInput
          value={msg}
          onChangeText={setMsg}
          onSubmitEditing={handleSend}
          placeholder="Nói gì đó..."
          placeholderTextColor="#8f7fb0"
          style={{ flex: 1, color: '#fff' }}
        />
        <TouchableOpacity onPress={handleSend} style={{ padding: 8 }}>
          <Ionicons name="send" size={18} color="#fff" />
        </TouchableOpacity>
      </XStack>
    </KeyboardAvoidingView>
    </Theme>
  )
}
