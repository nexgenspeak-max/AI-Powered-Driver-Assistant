import { Alert, ScrollView, TouchableOpacity } from 'react-native'
import { View, YStack, XStack, Text } from 'tamagui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { BackButton, getBackButtonClearance } from '../../src/components/BackButton'
import { GlassSurface } from '../../src/components/GlassSurface'
import { Badge } from '../../src/components/Badge'

const DOCUMENTS = [
  { key: 'license', label: 'Bằng lái xe' },
  { key: 'registration', label: 'Đăng ký xe' },
  { key: 'insurance', label: 'Bảo hiểm xe' },
]

export default function DocumentsScreen() {
  const insets = useSafeAreaInsets()

  return (
    <View flex={1} backgroundColor="$surface">
      <BackButton />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20, paddingTop: getBackButtonClearance(insets.top) + 16, paddingBottom: 100, gap: 20 }}
      >
        <Text fontSize="$6" fontWeight="800" color="$textPrimary">
          Giấy tờ xác minh
        </Text>
        <Text color="$textSecondary" lineHeight={20}>
          Tải lên giấy tờ để được xác minh và tiếp tục nhận chuyến. Tính năng tải ảnh giấy tờ đang được phát triển.
        </Text>

        <GlassSurface cornerRadius={20} outline>
          <YStack padding="$2">
            {DOCUMENTS.map((doc, i) => (
              <View key={doc.key}>
                <TouchableOpacity
                  onPress={() => Alert.alert('Sắp ra mắt', 'Tính năng tải lên giấy tờ sẽ sớm khả dụng.')}
                >
                  <XStack alignItems="center" justifyContent="space-between" paddingHorizontal="$2" paddingVertical="$3" marginVertical="$2">
                    <XStack alignItems="center" gap="$3">
                      <Ionicons name="document-attach-outline" size={20} color="#7C5B9C" />
                      <Text color="$textPrimary" fontWeight="500">
                        {doc.label}
                      </Text>
                    </XStack>
                    <Badge label="Chưa tải lên" backgroundColor="$chip" color="$textSecondary" />
                  </XStack>
                </TouchableOpacity>
                {i < DOCUMENTS.length - 1 && <View height={1} backgroundColor="$border" marginLeft={44} />}
              </View>
            ))}
          </YStack>
        </GlassSurface>
      </ScrollView>
    </View>
  )
}
