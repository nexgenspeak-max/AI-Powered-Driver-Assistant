import { useState } from 'react'
import { ScrollView, TouchableOpacity, Switch, Modal, StyleSheet } from 'react-native'
import { View, XStack, YStack, Text, useTheme, useThemeName } from 'tamagui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { useDriverContext } from '../../src/features/dashboard/hooks/useDriverContext'
import { ProfileCard } from '../../src/features/profile/components/ProfileCard'
import { GlassSurface } from '../../src/components/GlassSurface'
import { Button } from '../../src/components/Button'
import { ThemeToggle } from '../../src/components/ThemeToggle'
import { useAuthStore } from '../../src/stores/authStore'
import { useThemeStore } from '../../src/stores/themeStore'
import { useWakeWordSettingsStore } from '../../src/features/assistant-wakeword/wakeWordSettingsStore'
import { VoiceEnrollPanel } from '../../src/features/home/components/VoiceEnrollPanel'

// Literal per-screen background — same treatment as customer-app's Profile
// screen (app/(app)/profile.tsx there), locked to the exact reference hex
// rather than the shared `$surface` token, since GlassSurface/GlossyAvatar
// were tuned against these specific backdrops. Light is a gradient per the
// Shutterstock reference (#F4F4F6 -> #E2E2E6), dark stays the flat original.
const DARK_SCREEN_BACKGROUND = '#15111F'
const LIGHT_SCREEN_GRADIENT = ['#F4F4F6', '#E2E2E6'] as const

export default function ProfileScreen() {
  const driver = useAuthStore(s => s.driver)!
  const logout = useAuthStore(s => s.logout)
  const { data: context, isLoading } = useDriverContext()
  const wakeWordEnabled = useWakeWordSettingsStore(s => s.enabled)
  const setWakeWordEnabled = useWakeWordSettingsStore(s => s.setEnabled)
  const themeMode = useThemeStore(s => s.mode)
  const toggleTheme = useThemeStore(s => s.toggle)
  const theme = useTheme()
  const isLight = useThemeName() === 'light'
  const insets = useSafeAreaInsets()
  const [showVoiceEnroll, setShowVoiceEnroll] = useState(false)

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
      {!isLoading && context && <ProfileCard driver={driver} profile={context.driver_profile} />}

      <GlassSurface cornerRadius={20}>
        <XStack alignItems="center" justifyContent="space-between" paddingHorizontal="$4" paddingVertical="$4">
          <XStack alignItems="center" gap="$3" flex={1} paddingRight="$3">
            <Ionicons name="mic-circle-outline" size={20} color={theme.textSecondary.val} />
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
            <Ionicons name={themeMode === 'dark' ? 'moon-outline' : 'sunny-outline'} size={20} color={theme.textSecondary.val} />
            <Text color="$textPrimary" fontWeight="500">
              Chế độ tối
            </Text>
          </XStack>
          <ThemeToggle isDark={themeMode === 'dark'} onToggle={toggleTheme} />
        </XStack>
        <View height={1} backgroundColor="$border" />
        <MenuRow icon="mic-outline" label="Đổi giọng nói của bạn" onPress={() => setShowVoiceEnroll(true)} />
        <View height={1} backgroundColor="$border" />
        <MenuRow icon="information-circle-outline" label="Giới thiệu" onPress={() => router.push('/about')} />
        <View height={1} backgroundColor="$border" />
        <MenuRow icon="help-circle-outline" label="Câu hỏi thường gặp" onPress={() => router.push('/faq')} />
      </GlassSurface>

      <View marginTop="$2">
        <Button label="Log Out" variant="outline" onPress={() => logout()} full />
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
          <VoiceEnrollPanel sheet phone={driver.phone} accountId={driver.id} onDone={() => setShowVoiceEnroll(false)} />
        </View>
      </Modal>
    </View>
  )
}

function MenuRow({ icon, label, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) {
  const theme = useTheme()
  return (
    <TouchableOpacity onPress={onPress}>
      <XStack alignItems="center" justifyContent="space-between" paddingHorizontal="$4" paddingVertical="$4">
        <XStack alignItems="center" gap="$3">
          <Ionicons name={icon} size={20} color={theme.textSecondary.val} />
          <Text color="$textPrimary" fontWeight="500">
            {label}
          </Text>
        </XStack>
        <Ionicons name="chevron-forward" size={18} color={theme.textMuted.val} />
      </XStack>
    </TouchableOpacity>
  )
}
