import { TouchableOpacity } from 'react-native'
import { View, XStack, useTheme } from 'tamagui'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import Constants from 'expo-constants'
import { useMutation } from '@tanstack/react-query'
import { useDriverContext } from '../../src/features/dashboard/hooks/useDriverContext'
import { ProfileCard } from '../../src/features/profile/components/ProfileCard'
import { SectionTitle } from '../../src/features/profile/components/SectionTitle'
import { Screen } from '../../src/components/Screen'
import { Surface } from '../../src/components/Surface'
import { AppText } from '../../src/components/AppText'
import { ThemeToggle } from '../../src/components/ThemeToggle'
import { useAuthStore } from '../../src/stores/authStore'
import { useThemeStore } from '../../src/stores/themeStore'
import { useCurrentUser } from '../../src/features/auth/hooks/useCurrentUser'
import { driversService } from '../../src/services/api/drivers'
import { confirmDestructive } from '../../src/utils/confirmDialog'

export default function ProfileScreen() {
  const { data: driver } = useCurrentUser()
  const logout = useAuthStore(s => s.logout)
  // Best-effort: goes offline server-side before clearing tokens so a driver
  // who forgets to flip the dashboard toggle first doesn't keep showing as
  // available for dispatch after logging out. Never blocks the logout.
  const { mutate: logoutAndGoOffline } = useMutation({
    mutationFn: async () => {
      if (driver && driver.status === 'online') {
        await driversService.update(driver.phone, { status: 'offline' }).catch(() => {})
      }
    },
    onSettled: () => logout(),
  })
  const { data: context, isError, refetch } = useDriverContext()
  const themeMode = useThemeStore(s => s.mode)
  const toggleTheme = useThemeStore(s => s.toggle)

  if (!driver) return null

  return (
    <Screen scroll>
        {context ? (
          <ProfileCard driver={driver} profile={context.driver_profile} />
        ) : null}

        {!context && isError && (
          <XStack alignItems="center" justifyContent="space-between" gap="$3">
            <AppText variant="body" color="$textSecondary" flex={1}>
              Không thể tải thông tin hồ sơ.
            </AppText>
            <TouchableOpacity
              onPress={() => refetch()}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Thử lại"
              hitSlop={8}
              style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 4 }}
            >
              <AppText variant="label" color="$primary">
                Thử lại
              </AppText>
            </TouchableOpacity>
          </XStack>
        )}

        <Surface clip borderRadius={24}>
          <SectionTitle>Tài khoản</SectionTitle>
          <MenuRow icon="create-outline" label="Chỉnh sửa hồ sơ" onPress={() => router.push('/edit-profile')} />
          <Divider />
          <MenuRow icon="car-outline" label="Quản lý xe" onPress={() => router.push('/vehicle')} />
        </Surface>

        <Surface clip borderRadius={24}>
          <SectionTitle>Thanh toán & Giấy tờ</SectionTitle>
          <MenuRow icon="card-outline" label="Tài khoản ngân hàng" onPress={() => router.push('/bank-info')} />
          <Divider />
          <MenuRow icon="document-text-outline" label="Giấy tờ xác minh" onPress={() => router.push('/documents')} />
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
          <MenuRow icon="mic-outline" label="Cài đặt trợ lý" onPress={() => router.push('/assistant-settings')} />
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
            onPress={() => confirmDestructive({
              title: 'Đăng xuất?',
              message: 'Bạn sẽ cần đăng nhập lại để tiếp tục sử dụng ứng dụng.',
              cancelLabel: 'Ở lại',
              confirmLabel: 'Đăng xuất',
              onConfirm: () => logoutAndGoOffline(),
            })}
          />
        </Surface>

        <AppText variant="caption" color="$textMuted" textAlign="center">
          Phiên bản {Constants.expoConfig?.version ?? '1.0.0'}
        </AppText>
    </Screen>
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
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel={label}>
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
