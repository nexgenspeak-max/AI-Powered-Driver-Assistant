import { ScrollView, Linking, TouchableOpacity } from 'react-native'
import { View, YStack, XStack, Text } from 'tamagui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { BackButton, getBackButtonClearance } from '../../src/components/BackButton'
import { GlassSurface } from '../../src/components/GlassSurface'

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
  const insets = useSafeAreaInsets()

  return (
    <View flex={1} backgroundColor="$surface">
      <BackButton />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20, paddingTop: getBackButtonClearance(insets.top) + 16, paddingBottom: 100, gap: 20 }}
      >
        <Text fontSize="$6" fontWeight="800" color="$textPrimary">
          Trung tâm an toàn
        </Text>

        <GlassSurface cornerRadius={20} outline>
          <YStack padding="$4" gap="$1">
            <Text color="$textSecondary" fontSize={12} fontWeight="700" marginBottom="$2">
              Gọi khẩn cấp
            </Text>
            {EMERGENCY_NUMBERS.map((item, i) => (
              <View key={item.number}>
                <TouchableRow
                  label={item.label}
                  value={item.number}
                  onPress={() => Linking.openURL(`tel:${item.number}`)}
                />
                {i < EMERGENCY_NUMBERS.length - 1 && <View height={1} backgroundColor="$border" marginLeft={0} />}
              </View>
            ))}
          </YStack>
        </GlassSurface>

        <GlassSurface cornerRadius={20} outline>
          <YStack padding="$4" gap="$3">
            <Text color="$textSecondary" fontSize={12} fontWeight="700">
              Mẹo an toàn khi lái xe
            </Text>
            {SAFETY_TIPS.map((tip, i) => (
              <XStack key={i} gap="$2" alignItems="flex-start">
                <Ionicons name="shield-checkmark-outline" size={16} color="#34d399" style={{ marginTop: 2 }} />
                <Text color="$textPrimary" fontSize={13} lineHeight={19} flex={1}>
                  {tip}
                </Text>
              </XStack>
            ))}
          </YStack>
        </GlassSurface>
      </ScrollView>
    </View>
  )
}

function TouchableRow({ label, value, onPress }: { label: string; value: string; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress}>
      <XStack alignItems="center" justifyContent="space-between" paddingVertical="$3">
        <XStack alignItems="center" gap="$3">
          <Ionicons name="call" size={18} color="#ef4444" />
          <Text color="$textPrimary" fontWeight="500">
            {label}
          </Text>
        </XStack>
        <Text color="$textSecondary" fontWeight="600">
          {value}
        </Text>
      </XStack>
    </TouchableOpacity>
  )
}
