import { useState } from 'react'
import { ScrollView, TouchableOpacity, Switch, Modal, StyleSheet, Image, type ImageSourcePropType } from 'react-native'
import { View, XStack, YStack, Text, useTheme, useThemeName } from 'tamagui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { ProfileCard } from '../../src/features/profile/components/ProfileCard'
import { GlassSurface } from '../../src/components/GlassSurface'
import { Button } from '../../src/components/Button'
import { ThemeToggle } from '../../src/components/ThemeToggle'
import { useAuthStore } from '../../src/stores/authStore'
import { useThemeStore } from '../../src/stores/themeStore'
import { useWakeWordSettingsStore } from '../../src/features/assistant-wakeword/wakeWordSettingsStore'
import { useCurrentUser } from '../../src/features/auth/hooks/useCurrentUser'
import { VoiceEnrollPanel } from '../../src/features/home/components/VoiceEnrollPanel'

// Literal per-screen background, same approach as the trips/booking screens
// (features/trips/components/TripHistoryList.tsx, features/booking/
// components/BookingForm.tsx) — locked to the exact reference hex rather
// than the shared `$surface` token, since GlassSurface/GlossyAvatar were
// tuned against these specific backdrops. Light is a gradient per the
// Shutterstock reference (#F4F4F6 -> #E2E2E6), dark stays the flat original.
const DARK_SCREEN_BACKGROUND = '#15111F'
const LIGHT_SCREEN_GRADIENT = ['#F4F4F6', '#E2E2E6'] as const

// Light mode: flat, full-color icon set (assets/icons/light/) — swapped in
// for the plain Ionicons glyphs these settings rows used before. Fixed
// palette raster images (not tintable like a vector Ionicon), so they're
// sized larger and rendered without a `color` prop instead of relying on
// theme tinting for legibility.
// Dark mode: single-color silhouette set (assets/icons/dark/), tinted white
// so it reads against the dark background (see the `tintColor` on each Image
// below).
const ICONS = {
  voiceAssistant: require('../../assets/icons/light/voice-assistant.png') as ImageSourcePropType,
  sun: require('../../assets/icons/light/sun.png') as ImageSourcePropType,
  moon: require('../../assets/icons/light/moon.png') as ImageSourcePropType,
  microphone: require('../../assets/icons/light/microphone.png') as ImageSourcePropType,
  chatInfo: require('../../assets/icons/light/chat-info.png') as ImageSourcePropType,
  faq: require('../../assets/icons/light/faq.png') as ImageSourcePropType,
  logout: require('../../assets/icons/light/logout.png') as ImageSourcePropType,
}
const DARK_ICONS = {
  voiceAssistant: require('../../assets/icons/dark/voice-assistant.png') as ImageSourcePropType,
  sun: require('../../assets/icons/dark/sun.png') as ImageSourcePropType,
  moon: require('../../assets/icons/dark/moon.png') as ImageSourcePropType,
  microphone: require('../../assets/icons/dark/microphone.png') as ImageSourcePropType,
  chatInfo: require('../../assets/icons/dark/chat-info.png') as ImageSourcePropType,
  faq: require('../../assets/icons/dark/faq.png') as ImageSourcePropType,
  logout: require('../../assets/icons/dark/logout.png') as ImageSourcePropType,
}

export default function ProfileScreen() {
  // Profile is fetched (GET /auth/me), not persisted — see authStore.ts and
  // useCurrentUser.ts for why. This screen only renders inside the (app)
  // group, which already implies a valid access token, so the only wait
  // here is the network round trip, not "logged in or not".
  const { data: customer } = useCurrentUser()
  const logout = useAuthStore(s => s.logout)
  const wakeWordEnabled = useWakeWordSettingsStore(s => s.enabled)
  const setWakeWordEnabled = useWakeWordSettingsStore(s => s.setEnabled)
  const themeMode = useThemeStore(s => s.mode)
  const toggleTheme = useThemeStore(s => s.toggle)
  const theme = useTheme()
  const isLight = useThemeName() === 'light'
  const isDark = !isLight
  const insets = useSafeAreaInsets()
  const [showVoiceEnroll, setShowVoiceEnroll] = useState(false)

  if (!customer) return null

  return (
    <View flex={1}>
      {isLight ? (
        <LinearGradient colors={LIGHT_SCREEN_GRADIENT} style={StyleSheet.absoluteFillObject} />
      ) : (
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: DARK_SCREEN_BACKGROUND }]} />
      )}
      <ScrollView
        style={{ flex: 1, backgroundColor: 'transparent' }}
        contentContainerStyle={{ padding: 20, paddingTop: insets.top + 16, paddingBottom: 100, gap: 20 }}
      >
      <ProfileCard customer={customer} />

      <GlassSurface cornerRadius={20}>
        <XStack alignItems="center" justifyContent="space-between" paddingHorizontal="$4" paddingVertical="$4">
          <XStack alignItems="center" gap="$3" flex={1} paddingRight="$3">
            <Image
              source={isDark ? DARK_ICONS.voiceAssistant : ICONS.voiceAssistant}
              style={{ width: isDark ? 23 : 28, height: isDark ? 23 : 28, tintColor: isDark ? '#ffffff' : undefined }}
              resizeMode="contain"
            />
            <YStack flex={1}>
              <Text color="$textPrimary" fontWeight="500">
                Trợ lý rảnh tay
              </Text>
              <Text color="$textSecondary" fontSize={11} marginTop="$1">
                Nghe từ khoá đánh thức ở chế độ nền, kể cả khi đang dùng app khác
              </Text>
            </YStack>
          </XStack>
          <Switch value={wakeWordEnabled} onValueChange={setWakeWordEnabled} />
        </XStack>
        <View height={1} backgroundColor="$border" />
        <XStack alignItems="center" justifyContent="space-between" paddingHorizontal="$4" paddingVertical="$4">
          <XStack alignItems="center" gap="$3" flex={1} paddingRight="$3">
            <Image
              source={isDark ? DARK_ICONS.moon : ICONS.sun}
              style={{ width: isDark ? 20 : 24, height: isDark ? 20 : 24, tintColor: isDark ? '#ffffff' : undefined }}
              resizeMode="contain"
            />
            <Text color="$textPrimary" fontWeight="500">
              Chế độ tối
            </Text>
          </XStack>
          <ThemeToggle isDark={themeMode === 'dark'} onToggle={toggleTheme} />
        </XStack>
        <View height={1} backgroundColor="$border" />
        <MenuRow
          icon={isDark ? DARK_ICONS.microphone : ICONS.microphone}
          isDark={isDark}
          label="Đổi giọng nói của bạn"
          onPress={() => setShowVoiceEnroll(true)}
        />
        <View height={1} backgroundColor="$border" />
        <MenuRow
          icon={isDark ? DARK_ICONS.chatInfo : ICONS.chatInfo}
          isDark={isDark}
          label="Giới thiệu"
          onPress={() => router.push('/about')}
        />
        <View height={1} backgroundColor="$border" />
        <MenuRow
          icon={isDark ? DARK_ICONS.faq : ICONS.faq}
          isDark={isDark}
          label="Câu hỏi thường gặp"
          onPress={() => router.push('/faq')}
        />
      </GlassSurface>

      <View marginTop="$2">
        <Button
          label="Log Out"
          variant="outline"
          onPress={() => logout()}
          full
          icon={
            <Image
              source={isDark ? DARK_ICONS.logout : ICONS.logout}
              style={{ width: isDark ? 17 : 20, height: isDark ? 17 : 20, tintColor: isDark ? '#ffffff' : undefined }}
              resizeMode="contain"
            />
          }
        />
      </View>
      </ScrollView>

      {/* Bottom-sheet presentation per the reference mockup: the top area is
          deliberately empty (no close button/header) — dismissal is a tap
          anywhere on that empty backdrop, a standard bottom-sheet
          convention, rather than the screen having no way to close at all. */}
      <Modal visible={showVoiceEnroll} animationType="slide" transparent onRequestClose={() => setShowVoiceEnroll(false)}>
        <View flex={1}>
          {isLight ? (
            <LinearGradient colors={LIGHT_SCREEN_GRADIENT} style={StyleSheet.absoluteFillObject} />
          ) : (
            <View style={[StyleSheet.absoluteFillObject, { backgroundColor: DARK_SCREEN_BACKGROUND }]} />
          )}
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setShowVoiceEnroll(false)} />
          <VoiceEnrollPanel sheet phone={customer.phone} accountId={customer.id} onDone={() => setShowVoiceEnroll(false)} />
        </View>
      </Modal>
    </View>
  )
}

function MenuRow({
  icon,
  isDark,
  label,
  onPress,
}: {
  icon: ImageSourcePropType
  isDark: boolean
  label: string
  onPress: () => void
}) {
  const theme = useTheme()
  return (
    <TouchableOpacity onPress={onPress}>
      <XStack alignItems="center" justifyContent="space-between" paddingHorizontal="$4" paddingVertical="$4">
        <XStack alignItems="center" gap="$3">
          <Image
            source={icon}
            style={{ width: isDark ? 20 : 24, height: isDark ? 20 : 24, tintColor: isDark ? '#ffffff' : undefined }}
            resizeMode="contain"
          />
          <Text color="$textPrimary" fontWeight="500">
            {label}
          </Text>
        </XStack>
        <Ionicons name="chevron-forward" size={18} color={theme.textMuted.val} />
      </XStack>
    </TouchableOpacity>
  )
}
