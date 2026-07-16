import { ScrollView, TouchableOpacity, Switch } from 'react-native'
import { View, XStack, YStack, Text, useTheme } from 'tamagui'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useDriverContext } from '../../src/features/dashboard/hooks/useDriverContext'
import { ProfileCard } from '../../src/features/profile/components/ProfileCard'
import { Card } from '../../src/components/Card'
import { Button } from '../../src/components/Button'
import { useAuthStore } from '../../src/stores/authStore'
import { useThemeStore } from '../../src/stores/themeStore'
import { useWakeWordSettingsStore } from '../../src/features/assistant-wakeword/wakeWordSettingsStore'

export default function ProfileScreen() {
  const driver = useAuthStore(s => s.driver)!
  const logout = useAuthStore(s => s.logout)
  const { data: context, isLoading } = useDriverContext()
  const wakeWordEnabled = useWakeWordSettingsStore(s => s.enabled)
  const setWakeWordEnabled = useWakeWordSettingsStore(s => s.setEnabled)
  const themeMode = useThemeStore(s => s.mode)
  const toggleTheme = useThemeStore(s => s.toggle)
  const theme = useTheme()

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.surface.val }}
      contentContainerStyle={{ padding: 20, paddingTop: 64, paddingBottom: 100, gap: 16 }}
    >
      {!isLoading && context && <ProfileCard driver={driver} profile={context.driver_profile} />}

      <Card padding={0} overflow="hidden">
        <XStack alignItems="center" justifyContent="space-between" paddingHorizontal="$4" paddingVertical={14}>
          <XStack alignItems="center" gap="$3" flex={1} paddingRight="$3">
            <Ionicons name="mic-circle-outline" size={20} color={theme.textSecondary.val} />
            <YStack flex={1}>
              <Text color="$textPrimary" fontWeight="500">
                Trợ lý rảnh tay
              </Text>
              <Text color="$textSecondary" fontSize={11} marginTop={2}>
                Nghe từ khoá đánh thức ở chế độ nền, kể cả khi đang dùng app khác
              </Text>
            </YStack>
          </XStack>
          <Switch value={wakeWordEnabled} onValueChange={setWakeWordEnabled} />
        </XStack>
        <View height={1} backgroundColor="$border" />
        <XStack alignItems="center" justifyContent="space-between" paddingHorizontal="$4" paddingVertical={14}>
          <XStack alignItems="center" gap="$3" flex={1} paddingRight="$3">
            <Ionicons name={themeMode === 'dark' ? 'moon-outline' : 'sunny-outline'} size={20} color={theme.textSecondary.val} />
            <Text color="$textPrimary" fontWeight="500">
              Chế độ tối
            </Text>
          </XStack>
          <Switch value={themeMode === 'dark'} onValueChange={toggleTheme} />
        </XStack>
        <View height={1} backgroundColor="$border" />
        <MenuRow icon="information-circle-outline" label="Giới thiệu" onPress={() => router.push('/about')} />
        <View height={1} backgroundColor="$border" />
        <MenuRow icon="help-circle-outline" label="Câu hỏi thường gặp" onPress={() => router.push('/faq')} />
      </Card>

      <View marginTop="$2">
        <Button label="Log Out" variant="outline" onPress={() => logout()} full />
      </View>
    </ScrollView>
  )
}

function MenuRow({ icon, label, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) {
  const theme = useTheme()
  return (
    <TouchableOpacity onPress={onPress}>
      <XStack alignItems="center" justifyContent="space-between" paddingHorizontal="$4" paddingVertical={14}>
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
