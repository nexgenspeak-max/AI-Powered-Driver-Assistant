import { YStack } from 'tamagui'
import { Screen } from '../../src/components/Screen'
import { AppText } from '../../src/components/AppText'

const SECTIONS = [
  {
    title: '1. Chấp nhận điều khoản',
    body: 'Bằng việc sử dụng ứng dụng tài xế, bạn đồng ý tuân thủ các điều khoản sử dụng này. Nếu không đồng ý, vui lòng ngừng sử dụng dịch vụ.',
  },
  {
    title: '2. Tài khoản tài xế',
    body: 'Bạn chịu trách nhiệm bảo mật thông tin đăng nhập, giữ thông tin xe/giấy tờ chính xác và cập nhật, cũng như mọi hoạt động diễn ra dưới tài khoản của mình.',
  },
  {
    title: '3. Nhận chuyến và thanh toán',
    body: 'Tiền cước mỗi chuyến được tính dựa trên quãng đường và các phụ phí (nếu có), thanh toán theo chu kỳ đối soát của nền tảng.',
  },
  {
    title: '4. Tiêu chuẩn phục vụ',
    body: 'Tài xế cần đảm bảo xe đủ điều kiện an toàn, giấy tờ hợp lệ và thái độ phục vụ khách hàng đúng mực trong suốt quá trình vận hành.',
  },
  {
    title: '5. Quyền riêng tư',
    body: 'Chúng tôi thu thập và sử dụng dữ liệu vị trí, lịch sử chuyến đi và thông tin liên hệ của bạn để cung cấp và cải thiện dịch vụ, theo Chính sách bảo mật.',
  },
  {
    title: '6. Thay đổi điều khoản',
    body: 'Điều khoản này có thể được cập nhật theo thời gian. Việc tiếp tục sử dụng ứng dụng sau khi có thay đổi đồng nghĩa với việc bạn chấp nhận điều khoản mới.',
  },
]

export default function TermsScreen() {
  return (
    <Screen scroll title="Điều khoản & Bảo mật">
      <YStack gap="$4">
        {SECTIONS.map(section => (
          <YStack key={section.title} gap="$1">
            <AppText variant="h2">{section.title}</AppText>
            <AppText variant="body" color="$textSecondary">
              {section.body}
            </AppText>
          </YStack>
        ))}
      </YStack>
    </Screen>
  )
}
