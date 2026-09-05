import { TouchableOpacity } from 'react-native'
import { View, XStack, YStack, useTheme } from 'tamagui'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import Constants from 'expo-constants'
import { ProfileCard } from '../../src/features/profile/components/ProfileCard'
import { Screen } from '../../src/components/Screen'
import { Surface } from '../../src/components/Surface'
import { AppText } from '../../src/components/AppText'
import { Toggle } from '../../src/components/Toggle'
import { ThemeToggle } from '../../src/components/ThemeToggle'
import { useThemeStore } from '../../src/stores/themeStore'
import { confirmDestructive } from '../../src/utils/confirmDialog'
import { useWakeWordSettingsStore, WAKE_WORD_FEATURE_ENABLED } from '../../src/features/assistant-wakeword/wakeWordSettingsStore'
import { useCurrentUser } from '../../src/features/auth/hooks/useCurrentUser'
import { logoutAndReset } from '../../src/features/auth/logoutAndReset'

export default function ProfileScreen() {
  const { data: customer } = useCurrentUser()
  const wakeWordEnabled = useWakeWordSettingsStore(s => s.enabled)
  const setWakeWordEnabled = useWakeWordSettingsStore(s => s.setEnabled)
  const themeMode = useThemeStore(s => s.mode)
  const toggleTheme = useThemeStore(s => s.toggle)

  if (!customer) return null

  return (
    <Screen scroll>
      <ProfileCard customer={customer} />

      <Surface clip borderRadius={24}>
        <SectionTitle>Tài khoản</SectionTitle>
        <MenuRow icon="create-outline" label="Chỉnh sửa hồ sơ" onPress={() => router.push('/edit-profile')} />
      </Surface>

      <Surface clip borderRadius={24}>
        <SectionTitle>Thanh toán & Ưu đãi</SectionTitle>
        <MenuRow icon="card-outline" label="Phương thức thanh toán" onPress={() => router.push('/payment-methods')} />
        <Divider />
        <MenuRow icon="location-outline" label="Địa chỉ đã lưu" onPress={() => router.push('/addresses')} />
        <Divider />
        <MenuRow icon="pricetag-outline" label="Mã khuyến mãi" onPress={() => router.push('/promotions')} />
        <Divider />
        <MenuRow icon="gift-outline" label="Giới thiệu bạn bè" onPress={() => router.push('/referral')} />
      </Surface>

      <Surface clip borderRadius={24}>
        <SectionTitle>Hỗ trợ & Pháp lý</SectionTitle>
        <MenuRow icon="shield-checkmark-outline" label="Trung tâm an toàn" onPress={() => router.push('/safety')} />
        <Divider />
        <MenuRow icon="help-buoy-outline" label="Hỗ trợ" onPress={() => router.push('/support')} />
        <Divider />
        <MenuRow icon="document-outline" label="Điều khoản & Chính sách bảo mật" onPress={() => router.push('/terms')} />
      </Surface>

      <Surface clip borderRadius={24}>
        <SectionTitle>Cài đặt</SectionTitle>
        <XStack alignItems="center" justifyContent="space-between" paddingHorizontal="$4" paddingVertical="$4">
          <XStack alignItems="center" gap="$3" flex={1} paddingRight="$3">
            <RowIcon name="mic-outline" />
            <YStack flex={1}>
              <AppText variant="body">Trợ lý rảnh tay</AppText>
              <AppText variant="caption" color="$textSecondary" marginTop={2}>
                {WAKE_WORD_FEATURE_ENABLED
                  ? 'Nghe từ khoá đánh thức ở chế độ nền, kể cả khi đang dùng app khác'
                  : 'Tạm thời chưa khả dụng'}
              </AppText>
            </YStack>
          </XStack>
          <Toggle
            value={WAKE_WORD_FEATURE_ENABLED && wakeWordEnabled}
            onValueChange={setWakeWordEnabled}
            disabled={!WAKE_WORD_FEATURE_ENABLED}
            accessibilityLabel="Trợ lý rảnh tay"
          />
        </XStack>
        <Divider />
        <XStack alignItems="center" justifyContent="space-between" paddingHorizontal="$4" paddingVertical="$4">
          <XStack alignItems="center" gap="$3" flex={1} paddingRight="$3">
            <RowIcon name="moon-outline" />
            <AppText variant="body">Chế độ tối</AppText>
          </XStack>
          <ThemeToggle isDark={themeMode === 'dark'} onToggle={toggleTheme} />
        </XStack>
        <Divider />
        <MenuRow icon="information-circle-outline" label="Giới thiệu" onPress={() => router.push('/about')} />
        <Divider />
        <MenuRow icon="help-circle-outline" label="Câu hỏi thường gặp" onPress={() => router.push('/faq')} />
        <Divider />
        <MenuRow
          icon="log-out-outline"
          label="Đăng xuất"
          labelColor="$danger"
          showChevron={false}
          onPress={() =>
            confirmDestructive({
              title: 'Đăng xuất?',
              message: 'Bạn sẽ cần đăng nhập lại để tiếp tục sử dụng ứng dụng.',
              cancelLabel: 'Ở lại',
              confirmLabel: 'Đăng xuất',
              onConfirm: () => logoutAndReset(),
            })
          }
        />
      </Surface>

      <AppText variant="caption" color="$textMuted" textAlign="center">
        Phiên bản {Constants.expoConfig?.version ?? '1.0.0'}
      </AppText>
    </Screen>
  )
}

function SectionTitle({ children }: { children: string }) {
  return (
    <AppText
      variant="label"
      color="$textSecondary"
      textTransform="uppercase"
      letterSpacing={0.5}
      paddingHorizontal="$4"
      paddingTop="$4"
      paddingBottom="$2"
    >
      {children}
    </AppText>
  )
}

function RowIcon({ name }: { name: keyof typeof Ionicons.glyphMap }) {
  const theme = useTheme()
  return (
    <View width={24} alignItems="center">
      <Ionicons name={name} size={20} color={theme.textSecondary.val} />
    </View>
  )
}

function Divider() {
  return <View height={1} backgroundColor="$border" />
}

function MenuRow({
  icon,
  label,
  labelColor = '$textPrimary',
  showChevron = true,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap
  label: string
  labelColor?: string
  showChevron?: boolean
  onPress: () => void
}) {
  const theme = useTheme()
  return (
    <TouchableOpacity onPress={onPress} accessibilityRole="button">
      <XStack alignItems="center" justifyContent="space-between" paddingHorizontal="$4" paddingVertical="$4" minHeight={56}>
        <XStack alignItems="center" gap="$3" flex={1} paddingRight="$3">
          <RowIcon name={icon} />
          <AppText variant="body" color={labelColor} flexShrink={1} numberOfLines={1}>
            {label}
          </AppText>
        </XStack>
        {showChevron && <Ionicons name="chevron-forward" size={18} color={theme.textMuted.val} />}
      </XStack>
    </TouchableOpacity>
  )
}
