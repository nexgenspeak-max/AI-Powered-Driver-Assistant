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
import { useCurrentUser } from '../../auth/hooks/useCurrentUser'
import { useThemeStore } from '../../../stores/themeStore'
import { getAssistantReply } from '../../../services/api/assistant'
import { voiceService } from '../../../services/api/voice'
import { AssistantAvatar } from './AssistantAvatar'
import { VoiceEnrollPanel } from './VoiceEnrollPanel'

const MIC_LABEL = {
  idle: 'Bấm để nói chuyện với AI',
  connecting: 'Đang kết nối...',
  connected: 'Đang trong phiên thoại — bấm để ngắt',
  error: 'Kết nối lỗi, thử lại',
}

export function AssistantChatPanel() {
  const { data: driver } = useCurrentUser()
  const themeMode = useThemeStore(s => s.mode)
  const isLight = themeMode === 'light'
  const theme = useTheme()
  const { chats, addUserMessage, addBotMessage } = useAssistantChatStore()
  const voice = useVoiceSessionStore()
  const [msg, setMsg] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [stubLoading, setStubLoading] = useState(false)
  const [hasVoiceprint, setHasVoiceprint] = useState<boolean | null>(null)
  const scrollRef = useRef<ScrollView>(null)
  const insets = useSafeAreaInsets()

  // Gate the very first AI conversation on voiceprint enrollment — checked once
  // per mount, not on every mic press, so an already-enrolled driver's tap
  // connects instantly instead of waiting on this network round-trip.
  useEffect(() => {
    if (!driver?.id) return
    voiceService.checkVoiceprint(driver.id).then(setHasVoiceprint).catch(() => setHasVoiceprint(true))
  }, [driver?.id])

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
    if (!driver?.phone) {
      setError('Không tìm thấy số điện thoại tài xế.')
      return
    }
    voice.connect(driver.phone)
  }

  return (
    // Follows the app-wide light/dark toggle now (previously always forced
    // dark, regardless of the user's setting). Chat bubble colors below are
    // still fixed on purpose, not theme tokens: AI = white text on black,
    // user = black text on purple, in light mode specifically.
    <Theme name={themeMode}>
    <StatusBar style={isLight ? 'dark' : 'light'} />
    {hasVoiceprint === false && driver ? (
      // Mandatory first-time gate: no voiceprint enrolled yet -> the whole
      // chat UI is replaced by enrollment, not just blocked on mic-press —
      // the driver can't reach chat/text-only fallback until this passes.
      <View flex={1} backgroundColor="$surface" justifyContent="center" paddingHorizontal={20}>
        <VoiceEnrollPanel phone={driver.phone} accountId={driver.id} onDone={setHasVoiceprint} />
      </View>
    ) : (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.surface.val }}
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
            // User bubble: purple gradient, black text in light mode (white
            // in dark, where black text on this same gradient reads poorly).
            <View key={i} maxWidth="80%" alignSelf="flex-end" borderRadius="$bubble" overflow="hidden">
              <LinearGradient
                colors={['#7C5B9C', '#A855F7']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ paddingHorizontal: 16, paddingVertical: 10 }}
              >
                <Text color={isLight ? '#000000' : '$textInverse'}>{chat.msg}</Text>
              </LinearGradient>
            </View>
          ) : (
            // AI bubble: fixed black background + white text in light mode
            // (so it stays legible against the now-white screen background);
            // dark mode keeps the theme-derived $accent/$textPrimary pair.
            <View
              key={i}
              maxWidth="80%"
              alignSelf="flex-start"
              backgroundColor={isLight ? '#000000' : '$accent'}
              borderRadius="$bubble"
              paddingHorizontal={16}
              paddingVertical={10}
            >
              <Text color={isLight ? '#ffffff' : '$textPrimary'}>{chat.msg}</Text>
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
                    : isLight ? '#1a1a1a' : '#fff'
            }
          />
        </TouchableOpacity>
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
          style={{ flex: 1, color: isLight ? '#1a1a1a' : '#fff' }}
        />
        <TouchableOpacity onPress={handleSend} style={{ padding: 8 }}>
          <Ionicons name="send" size={18} color={isLight ? '#1a1a1a' : '#fff'} />
        </TouchableOpacity>
      </XStack>
    </KeyboardAvoidingView>
    )}
    </Theme>
  )
}
