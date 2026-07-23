import { ScrollView, Linking, TouchableOpacity } from 'react-native'
import { View, YStack, XStack, Text } from 'tamagui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { BackButton, getBackButtonClearance } from '../../src/components/BackButton'
import { GlassSurface } from '../../src/components/GlassSurface'

const SUPPORT_PHONE = '1900 1234'
const SUPPORT_EMAIL = 'support@czen.vn'

export default function SupportScreen() {
  const insets = useSafeAreaInsets()

  return (
    <View flex={1} backgroundColor="$surface">
      <BackButton />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20, paddingTop: getBackButtonClearance(insets.top) + 16, paddingBottom: 100, gap: 20 }}
      >
        <Text fontSize="$6" fontWeight="800" color="$textPrimary">
          Hỗ trợ
        </Text>
        <Text color="$textSecondary" lineHeight={20}>
          Cần giúp đỡ? Liên hệ với đội ngũ hỗ trợ của chúng tôi qua các kênh bên dưới, hoặc xem câu hỏi thường gặp.
        </Text>

        <GlassSurface cornerRadius={20}>
          <YStack padding="$4" gap="$1">
            <Row
              iconName="call"
              iconColor="#34d399"
              label="Hotline hỗ trợ"
              value={SUPPORT_PHONE}
              onPress={() => Linking.openURL(`tel:${SUPPORT_PHONE.replace(/\s/g, '')}`)}
            />
            <View height={1} backgroundColor="$border" />
            <Row
              iconName="mail"
              iconColor="#8B5CF6"
              label="Email hỗ trợ"
              value={SUPPORT_EMAIL}
              onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`)}
            />
            <View height={1} backgroundColor="$border" />
            <Row
              iconName="help-circle"
              iconColor="#f59e0b"
              label="Câu hỏi thường gặp"
              value=""
              onPress={() => router.push('/faq')}
            />
          </YStack>
        </GlassSurface>
      </ScrollView>
    </View>
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
  return (
    <TouchableOpacity onPress={onPress}>
      <XStack alignItems="center" justifyContent="space-between" paddingVertical="$3">
        <XStack alignItems="center" gap="$3">
          <Ionicons name={iconName} size={18} color={iconColor} />
          <Text color="$textPrimary" fontWeight="500">
            {label}
          </Text>
        </XStack>
        {!!value && (
          <Text color="$textSecondary" fontWeight="600">
            {value}
          </Text>
        )}
      </XStack>
    </TouchableOpacity>
  )
}
