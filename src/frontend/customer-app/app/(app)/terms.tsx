import { ScrollView } from 'react-native'
import { View, YStack, Text } from 'tamagui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { BackButton, getBackButtonClearance } from '../../src/components/BackButton'
import { AppText } from '../../src/components/AppText'

const SECTIONS = [
  {
    title: '1. Chấp nhận điều khoản',
    body: 'Bằng việc sử dụng ứng dụng, bạn đồng ý tuân thủ các điều khoản sử dụng này. Nếu không đồng ý, vui lòng ngừng sử dụng dịch vụ.',
  },
  {
    title: '2. Tài khoản người dùng',
    body: 'Bạn chịu trách nhiệm bảo mật thông tin đăng nhập của mình và mọi hoạt động diễn ra dưới tài khoản của bạn.',
  },
  {
    title: '3. Đặt xe và thanh toán',
    body: 'Giá cước hiển thị trước khi xác nhận chuyến đi là giá ước tính và có thể thay đổi tuỳ theo lộ trình thực tế, thời gian di chuyển và các phụ phí phát sinh.',
  },
  {
    title: '4. Quyền riêng tư',
    body: 'Chúng tôi thu thập và sử dụng dữ liệu vị trí, lịch sử chuyến đi và thông tin liên hệ của bạn để cung cấp và cải thiện dịch vụ, theo Chính sách bảo mật.',
  },
  {
    title: '5. Thay đổi điều khoản',
    body: 'Điều khoản này có thể được cập nhật theo thời gian. Việc tiếp tục sử dụng ứng dụng sau khi có thay đổi đồng nghĩa với việc bạn chấp nhận điều khoản mới.',
  },
]

export default function TermsScreen() {
  const insets = useSafeAreaInsets()

  return (
    <View flex={1} backgroundColor="$surface">
      <BackButton />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20, paddingTop: getBackButtonClearance(insets.top) + 16, paddingBottom: 100 }}
      >
        <AppText variant="h1" marginBottom="$3">
          Điều khoản sử dụng & Chính sách bảo mật
        </AppText>
        <YStack gap="$4">
          {SECTIONS.map(section => (
            <YStack key={section.title} gap="$1">
              <AppText variant="h2" color="$textPrimary">
                {section.title}
              </AppText>
              <Text color="$textSecondary" lineHeight={22}>
                {section.body}
              </Text>
            </YStack>
          ))}
        </YStack>
      </ScrollView>
    </View>
  )
}
