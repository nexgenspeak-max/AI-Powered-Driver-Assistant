import { useState } from 'react'
import { ScrollView, TouchableOpacity, Switch, Modal, StyleSheet, Image, type ImageSourcePropType } from 'react-native'
import { View, XStack, YStack, Text, useTheme, useThemeName } from 'tamagui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import Constants from 'expo-constants'
import { useDriverContext } from '../../src/features/dashboard/hooks/useDriverContext'
import { ProfileCard } from '../../src/features/profile/components/ProfileCard'
import { SectionTitle } from '../../src/features/profile/components/SectionTitle'
import { GlassSurface } from '../../src/components/GlassSurface'
import { ThemeToggle } from '../../src/components/ThemeToggle'
import { useAuthStore } from '../../src/stores/authStore'
import { useThemeStore } from '../../src/stores/themeStore'
import { useWakeWordSettingsStore } from '../../src/features/assistant-wakeword/wakeWordSettingsStore'
import { useCurrentUser } from '../../src/features/auth/hooks/useCurrentUser'
import { VoiceEnrollPanel } from '../../src/features/home/components/VoiceEnrollPanel'

// Literal per-screen background — same treatment as customer-app's Profile
// screen (app/(app)/profile.tsx there), locked to the exact reference hex
// rather than the shared `$surface` token, since GlassSurface/GlossyAvatar
// were tuned against these specific backdrops. Light is a gradient per the
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
  editProfile: require('../../assets/icons/light/edit-profile.png') as ImageSourcePropType,
  vehicle: require('../../assets/icons/light/vehicle.png') as ImageSourcePropType,
  bank: require('../../assets/icons/light/bank.png') as ImageSourcePropType,
  documents: require('../../assets/icons/light/documents.png') as ImageSourcePropType,
  safety: require('../../assets/icons/light/safety.png') as ImageSourcePropType,
  support: require('../../assets/icons/light/support.png') as ImageSourcePropType,
  terms: require('../../assets/icons/light/terms.png') as ImageSourcePropType,
}
const DARK_ICONS = {
  voiceAssistant: require('../../assets/icons/dark/voice-assistant.png') as ImageSourcePropType,
  sun: require('../../assets/icons/dark/sun.png') as ImageSourcePropType,
  moon: require('../../assets/icons/dark/moon.png') as ImageSourcePropType,
  microphone: require('../../assets/icons/dark/microphone.png') as ImageSourcePropType,
  chatInfo: require('../../assets/icons/dark/chat-info.png') as ImageSourcePropType,
  faq: require('../../assets/icons/dark/faq.png') as ImageSourcePropType,
  logout: require('../../assets/icons/dark/logout.png') as ImageSourcePropType,
  editProfile: require('../../assets/icons/dark/edit-profile.png') as ImageSourcePropType,
  vehicle: require('../../assets/icons/dark/vehicle.png') as ImageSourcePropType,
  bank: require('../../assets/icons/dark/bank.png') as ImageSourcePropType,
  documents: require('../../assets/icons/dark/documents.png') as ImageSourcePropType,
  safety: require('../../assets/icons/dark/safety.png') as ImageSourcePropType,
  support: require('../../assets/icons/dark/support.png') as ImageSourcePropType,
  terms: require('../../assets/icons/dark/terms.png') as ImageSourcePropType,
}

export default function ProfileScreen() {
  // Profile is fetched (GET /auth/me), not persisted — see authStore.ts and
  // useCurrentUser.ts for why. This screen only renders inside the (app)
  // group, which already implies a valid access token, so the only wait
  // here is the network round trip, not "logged in or not".
  const { data: driver } = useCurrentUser()
  const logout = useAuthStore(s => s.logout)
  const { data: context, isLoading } = useDriverContext()
  const wakeWordEnabled = useWakeWordSettingsStore(s => s.enabled)
  const setWakeWordEnabled = useWakeWordSettingsStore(s => s.setEnabled)
  const themeMode = useThemeStore(s => s.mode)
  const toggleTheme = useThemeStore(s => s.toggle)
  const theme = useTheme()
  const isLight = useThemeName() === 'light'
  const isDark = !isLight
  const insets = useSafeAreaInsets()
  const [showVoiceEnroll, setShowVoiceEnroll] = useState(false)

  if (!driver) return null

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
        <SectionTitle>Tài khoản</SectionTitle>
        <MenuRow
          icon={isDark ? DARK_ICONS.editProfile : ICONS.editProfile}
          isDark={isDark}
          label="Chỉnh sửa hồ sơ"
          onPress={() => router.push('/edit-profile')}
        />
        <View height={1} backgroundColor="$border" />
        <MenuRow
          icon={isDark ? DARK_ICONS.vehicle : ICONS.vehicle}
          isDark={isDark}
          label="Quản lý xe"
          onPress={() => router.push('/vehicle')}
        />
      </GlassSurface>

      <GlassSurface cornerRadius={20}>
        <SectionTitle>Thanh toán & Giấy tờ</SectionTitle>
        <MenuRow
          icon={isDark ? DARK_ICONS.bank : ICONS.bank}
          isDark={isDark}
          label="Tài khoản ngân hàng"
          onPress={() => router.push('/bank-info')}
        />
        <View height={1} backgroundColor="$border" />
        <MenuRow
          icon={isDark ? DARK_ICONS.documents : ICONS.documents}
          isDark={isDark}
          label="Giấy tờ xác minh"
          onPress={() => router.push('/documents')}
        />
      </GlassSurface>

      <GlassSurface cornerRadius={20}>
        <SectionTitle>Hỗ trợ & Pháp lý</SectionTitle>
        <MenuRow
          icon={isDark ? DARK_ICONS.safety : ICONS.safety}
          isDark={isDark}
          label="Trung tâm an toàn"
          onPress={() => router.push('/safety')}
        />
        <View height={1} backgroundColor="$border" />
        <MenuRow
          icon={isDark ? DARK_ICONS.support : ICONS.support}
          isDark={isDark}
          label="Hỗ trợ"
          onPress={() => router.push('/support')}
        />
        <View height={1} backgroundColor="$border" />
        <MenuRow
          icon={isDark ? DARK_ICONS.terms : ICONS.terms}
          isDark={isDark}
          label="Điều khoản & Chính sách bảo mật"
          onPress={() => router.push('/terms')}
        />
      </GlassSurface>

      <GlassSurface cornerRadius={20}>
        <SectionTitle>Cài đặt</SectionTitle>
        <XStack alignItems="center" justifyContent="space-between" paddingHorizontal="$4" paddingVertical="$4">
          <XStack alignItems="center" gap="$3" flex={1} paddingRight="$3">
            <Image
              source={isDark ? DARK_ICONS.voiceAssistant : ICONS.voiceAssistant}
              style={{ width: isDark ? 20 : 24, height: isDark ? 20 : 24, tintColor: isDark ? '#ffffff' : undefined }}
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
        <View height={1} backgroundColor="$border" />
        <MenuRow
          icon={isDark ? DARK_ICONS.logout : ICONS.logout}
          isDark={isDark}
          label="Đăng xuất"
          labelColor="$danger"
          showChevron={false}
          onPress={() => logout()}
        />
      </GlassSurface>

      <Text color="$textMuted" fontSize={12} textAlign="center">
        Phiên bản {Constants.expoConfig?.version ?? '1.0.0'}
      </Text>
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

function MenuRow({
  icon,
  ionIcon,
  isDark,
  label,
  labelColor = '$textPrimary',
  showChevron = true,
  onPress,
}: {
  icon?: ImageSourcePropType
  /** Alternative to `icon` for rows added without a matching light/dark PNG asset — a themed vector glyph instead. */
  ionIcon?: keyof typeof Ionicons.glyphMap
  isDark: boolean
  label: string
  labelColor?: string
  showChevron?: boolean
  onPress: () => void
}) {
  const theme = useTheme()
  return (
    <TouchableOpacity onPress={onPress} >
      <XStack alignItems="center" justifyContent="space-between" paddingHorizontal="$4" paddingVertical="$4">
        <XStack alignItems="center" gap="$3" flex={1} paddingRight="$3">
          {icon ? (
            <Image
              source={icon}
              style={{ width: isDark ? 20 : 24, height: isDark ? 20 : 24, tintColor: isDark ? '#ffffff' : undefined}}
              resizeMode="contain"
            />
          ) : (
            <View width={24} alignItems="center">
              <Ionicons name={ionIcon} size={20} color={theme.textSecondary.val} />
            </View>
          )}
          <Text color={labelColor} fontWeight="500" flexShrink={1} numberOfLines={1}>
            {label}
          </Text>
        </XStack>
        {showChevron && <Ionicons name="chevron-forward" size={18} color={theme.textMuted.val} />}
      </XStack>
    </TouchableOpacity>
  )
}
