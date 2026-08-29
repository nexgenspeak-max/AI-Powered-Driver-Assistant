import { Linking, TouchableOpacity } from 'react-native'
import { View, YStack, XStack, useTheme } from 'tamagui'
import { Ionicons } from '@expo/vector-icons'
import { Screen } from '../../src/components/Screen'
import { Surface } from '../../src/components/Surface'
import { AppText } from '../../src/components/AppText'

const EMERGENCY_NUMBERS = [
  { label: 'Công an', number: '113' },
  { label: 'Cấp cứu y tế', number: '115' },
  { label: 'Phòng cháy chữa cháy', number: '114' },
]

const SAFETY_TIPS = [
  'Xác nhận đúng khách hàng và điểm đón trước khi bắt đầu chuyến đi.',
  'Nghỉ ngơi đầy đủ, không nhận chuyến khi cảm thấy quá mệt hoặc buồn ngủ.',
  'Luôn thắt dây an toàn và tuân thủ luật giao thông trong suốt chuyến đi.',
  'Nếu gặp tình huống bất thường với khách, hãy dừng xe ở nơi an toàn và liên hệ khẩn cấp ngay.',
]

export default function SafetyScreen() {
  const theme = useTheme()

  return (
    <Screen scroll backButton>
      <AppText variant="h1">Trung tâm an toàn</AppText>

      <Surface flat>
        <YStack padding="$4" gap="$1">
          <AppText variant="label" color="$textSecondary" marginBottom="$2">
            Gọi khẩn cấp
          </AppText>
          {EMERGENCY_NUMBERS.map((item, i) => (
            <View key={item.number}>
              <TouchableRow
                label={item.label}
                value={item.number}
                iconColor={theme.danger.val}
                onPress={() => Linking.openURL(`tel:${item.number}`)}
              />
              {i < EMERGENCY_NUMBERS.length - 1 && (
                <View height={1} backgroundColor="$border" alignSelf="stretch" />
              )}
            </View>
          ))}
        </YStack>
      </Surface>

      <Surface flat>
        <YStack padding="$4" gap="$3">
          <AppText variant="label" color="$textSecondary">
            Mẹo an toàn khi lái xe
          </AppText>
          {SAFETY_TIPS.map((tip, i) => (
            <XStack key={i} gap="$2" alignItems="flex-start">
              <Ionicons name="shield-checkmark-outline" size={16} color={theme.success.val} style={{ marginTop: 2 }} />
              <AppText variant="body" flex={1}>
                {tip}
              </AppText>
            </XStack>
          ))}
        </YStack>
      </Surface>
    </Screen>
  )
}

function TouchableRow({
  label,
  value,
  iconColor,
  onPress,
}: {
  label: string
  value: string
  iconColor: string
  onPress: () => void
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`Gọi ${label}, ${value}`}
      hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
    >
      <XStack alignItems="center" justifyContent="space-between" gap="$3" paddingVertical="$3" minHeight={44}>
        <XStack alignItems="center" gap="$3" flex={1}>
          <Ionicons name="call" size={18} color={iconColor} />
          <AppText variant="label" flexShrink={1} numberOfLines={1}>
            {label}
          </AppText>
        </XStack>
        <AppText variant="bodyStrong" color="$textSecondary" flexShrink={1} numberOfLines={1}>
          {value}
        </AppText>
      </XStack>
    </TouchableOpacity>
  )
}
