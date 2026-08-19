import { useEffect, useRef, useState } from 'react'
import { ScrollView, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native'
import { View, XStack, Text, Theme, useTheme } from 'tamagui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { GlassSheen } from '../../../components/LiquidGlass'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { StatusBar } from 'expo-status-bar'
import { useAssistantChatStore } from '../stores/assistantChatStore'
import { useVoiceSessionStore, subscribeVoiceMessages } from '../stores/voiceSessionStore'
import { useThemeStore } from '../../../stores/themeStore'
import { getAssistantReply } from '../../../services/api/assistant'

// Connect/disconnect is driven by the draggable GlobalAssistantOrb now (see
// that component, mounted once at the (app) layout level) — this label just
// reflects its status, matching driver-app's chat panel.
const MIC_LABEL = {
  idle: 'Chạm vào quả cầu để kết nối với trợ lý',
  connecting: 'Đang kết nối...',
  connected: 'Đang trong phiên thoại — chạm vào quả cầu để ngắt',
  error: 'Kết nối lỗi, thử lại',
}

export function AssistantChatPanel() {
  const themeMode = useThemeStore(s => s.mode)
  const isLight = themeMode === 'light'
  const theme = useTheme()
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

  return (
    // Follows the app-wide light/dark toggle now (previously always forced
    // dark, regardless of the user's setting). Chat bubble colors below are
    // still fixed on purpose, not theme tokens: AI = white text on black,
    // user = black text on purple, in light mode specifically.
    <Theme name={themeMode}>
    <StatusBar style={isLight ? 'dark' : 'light'} />
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.surface.val }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={60}
    >
      <View width="100%" paddingTop={insets.top}>
        {/* The orb itself now lives in GlobalAssistantOrb, mounted once at
            the (app) layout level as a small draggable bubble on every tab
            (Home included) — no more full-size 360px canvas reserved here,
            matching driver-app's chat panel. */}
        <Text textAlign="center" color="$textSecondary" fontSize="$1" marginTop="$2" paddingTop="$2">
          {voice.status === 'connected' && voice.isCallActive
            ? 'Đang trong cuộc gọi — không thể tắt'
            : MIC_LABEL[voice.status]}
        </Text>
      </View>

      <ScrollView
        ref={scrollRef}
        style={{ flex: 1, paddingHorizontal: 20, marginTop: 16 }}
        contentContainerStyle={{ gap: 8, paddingBottom: 8 }}
      >
        {chats.map((chat, i) =>
          chat.who === 'me' ? (
            // User bubble: purple gradient, always white text regardless of
            // theme — the gradient itself doesn't change with light/dark,
            // so the text shouldn't need to either.
            <View key={i} maxWidth="80%" alignSelf="flex-end" borderRadius="$bubble" overflow="hidden">
              <LinearGradient
                colors={['#7C5B9C', '#A855F7']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ paddingHorizontal: 16, paddingVertical: 10 }}
              >
                <Text color="#ffffff">{chat.msg}</Text>
              </LinearGradient>
            </View>
          ) : (
            // AI bubble: light card + dark text in light mode, matching the
            // rest of the light-mode UI (glass cards, dark $textPrimary) —
            // was a hardcoded black bubble/white text even in light mode,
            // which read as broken/out of place against an otherwise white
            // screen. Dark mode keeps the theme-derived $accent/$textPrimary
            // pair, unchanged.
            <View
              key={i}
              maxWidth="80%"
              alignSelf="flex-start"
              backgroundColor={isLight ? '$surfaceElevated' : '$accent'}
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
        shadowOffset={{ width: 0, height: 8 }}
        shadowOpacity={0.35}
        shadowRadius={18}
      >
        <GlassSheen borderRadius={24} />
        <TextInput
          value={msg}
          onChangeText={setMsg}
          onSubmitEditing={handleSend}
          placeholder="Nói gì đó..."
          placeholderTextColor={isLight ? '#8b8792' : '#8f7fb0'}
          // Highlighted-text (select-all) color — was left at the OS
          // default (a generic blue), which clashed against this app's
          // purple-branded glass fields. Brighter in dark mode (#C084FC vs
          // #8B5CF6) since a highlight needs more contrast against a dark
          // field than a light one.
          selectionColor={isLight ? '#8B5CF6' : '#C084FC'}
          style={{ flex: 1, color: isLight ? '#1a1a1a' : '#fff', paddingLeft: 8 }}
        />
        <TouchableOpacity onPress={handleSend} style={{ padding: 8 }}>
          <Ionicons name="send" size={18} color={isLight ? '#1a1a1a' : '#fff'} />
        </TouchableOpacity>
      </XStack>
    </KeyboardAvoidingView>
    </Theme>
  )
}
