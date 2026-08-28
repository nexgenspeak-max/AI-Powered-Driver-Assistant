import { Alert, ScrollView, TouchableOpacity } from 'react-native'
import { View, YStack, XStack, Text } from 'tamagui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { BackButton, getBackButtonClearance } from '../../src/components/BackButton'
import { Surface } from '../../src/components/Surface'
import { AppText } from '../../src/components/AppText'
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
        <AppText variant="h1">
          Giấy tờ xác minh
        </AppText>
        <Text color="$textSecondary" lineHeight={20}>
          Tải lên giấy tờ để được xác minh và tiếp tục nhận chuyến. Tính năng tải ảnh giấy tờ đang được phát triển.
        </Text>

        <Surface flat>
          <YStack padding="$2">
            {DOCUMENTS.map((doc, i) => (
              <View key={doc.key}>
                <TouchableOpacity
                  onPress={() => Alert.alert('Sắp ra mắt', 'Tính năng tải lên giấy tờ sẽ sớm khả dụng.')}
                  accessibilityRole="button"
                >
                  <XStack alignItems="center" justifyContent="space-between" gap="$3" paddingHorizontal="$2" paddingVertical="$3">
                    <XStack alignItems="center" gap="$3" flex={1}>
                      <Ionicons name="document-attach-outline" size={20} color="#8B5CF6" />
                      <Text color="$textPrimary" fontWeight="500" flexShrink={1} numberOfLines={1}>
                        {doc.label}
                      </Text>
                    </XStack>
                    <Badge label="Chưa tải lên" backgroundColor="$chip" color="$textSecondary" />
                  </XStack>
                </TouchableOpacity>
                {i < DOCUMENTS.length - 1 && <View height={1} backgroundColor="$border" marginLeft={44} alignSelf="stretch" />}
              </View>
            ))}
          </YStack>
        </Surface>
      </ScrollView>
    </View>
  )
}
