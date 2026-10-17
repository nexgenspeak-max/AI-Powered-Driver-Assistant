import { Alert, TouchableOpacity } from 'react-native'
import { View, YStack, XStack, useTheme } from 'tamagui'
import { Ionicons } from '@expo/vector-icons'
import { Screen } from '../../src/components/Screen'
import { Surface } from '../../src/components/Surface'
import { AppText } from '../../src/components/AppText'
import { Badge } from '../../src/components/Badge'

const DOCUMENTS = [
  { key: 'license', label: 'Bằng lái xe' },
  { key: 'registration', label: 'Đăng ký xe' },
  { key: 'insurance', label: 'Bảo hiểm xe' },
]

export default function DocumentsScreen() {
  const theme = useTheme()

  return (
    <Screen scroll title="Giấy tờ xác minh">
      <AppText variant="body" color="$textSecondary">
        Tải lên giấy tờ để được xác minh và tiếp tục nhận chuyến. Tính năng tải ảnh giấy tờ đang được phát triển.
      </AppText>

      <Surface flat>
        <YStack padding="$2">
          {DOCUMENTS.map((doc, i) => (
            <View key={doc.key}>
              <TouchableOpacity
                onPress={() => Alert.alert('Sắp ra mắt', 'Tính năng tải lên giấy tờ sẽ sớm khả dụng.')}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={`Tải lên ${doc.label}`}
                hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
              >
                <XStack alignItems="center" justifyContent="space-between" gap="$3" paddingHorizontal="$2" paddingVertical="$3" minHeight={44}>
                  <XStack alignItems="center" gap="$3" flex={1}>
                    <Ionicons name="document-attach-outline" size={20} color={theme.primary.val} />
                    <AppText variant="label" flexShrink={1} numberOfLines={1}>
                      {doc.label}
                    </AppText>
                  </XStack>
                  <Badge label="Chưa tải lên" backgroundColor="$chip" color="$textSecondary" />
                </XStack>
              </TouchableOpacity>
              {i < DOCUMENTS.length - 1 && (
                <View height={1} backgroundColor="$border" marginLeft={44} alignSelf="stretch" />
              )}
            </View>
          ))}
        </YStack>
      </Surface>
    </Screen>
  )
}
