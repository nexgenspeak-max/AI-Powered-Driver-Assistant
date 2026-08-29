import { Linking, TouchableOpacity } from 'react-native'
import { View, YStack, XStack, useTheme } from 'tamagui'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { Screen } from '../../src/components/Screen'
import { Surface } from '../../src/components/Surface'
import { AppText } from '../../src/components/AppText'

const SUPPORT_PHONE = '1900 1234'
const SUPPORT_EMAIL = 'driver-support@czen.vn'

export default function SupportScreen() {
  const theme = useTheme()

  return (
    <Screen scroll backButton>
      <AppText variant="h1">Hỗ trợ</AppText>
      <AppText variant="body" color="$textSecondary">
        Cần giúp đỡ? Liên hệ với đội ngũ hỗ trợ tài xế qua các kênh bên dưới, hoặc xem câu hỏi thường gặp.
      </AppText>

      <Surface flat>
        <YStack padding="$4" gap="$1">
          <Row
            iconName="call"
            iconColor={theme.success.val}
            label="Hotline hỗ trợ tài xế"
            value={SUPPORT_PHONE}
            onPress={() => Linking.openURL(`tel:${SUPPORT_PHONE.replace(/\s/g, '')}`)}
          />
          <View height={1} backgroundColor="$border" />
          <Row
            iconName="mail"
            iconColor={theme.primary.val}
            label="Email hỗ trợ"
            value={SUPPORT_EMAIL}
            onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`)}
          />
          <View height={1} backgroundColor="$border" />
          <Row
            iconName="help-circle"
            iconColor={theme.warning.val}
            label="Câu hỏi thường gặp"
            value=""
            onPress={() => router.push('/faq')}
          />
        </YStack>
      </Surface>
    </Screen>
  )
}

function Row({
  iconName,
  iconColor,
  label,
  value,
  onPress,
}: {
  iconName: keyof typeof Ionicons.glyphMap
  iconColor: string
  label: string
  value: string
  onPress: () => void
}) {
  const a11yLabel = value ? `${label}, ${value}` : label

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
      hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
    >
      <XStack alignItems="center" justifyContent="space-between" gap="$3" paddingVertical="$3" minHeight={44}>
        <XStack alignItems="center" gap="$3" flex={1}>
          <Ionicons name={iconName} size={20} color={iconColor} />
          <AppText variant="label" flexShrink={1} numberOfLines={1}>
            {label}
          </AppText>
        </XStack>
        {!!value && (
          <AppText variant="bodyStrong" color="$textSecondary" flexShrink={1} numberOfLines={1}>
            {value}
          </AppText>
        )}
      </XStack>
    </TouchableOpacity>
  )
}
