import { Stack, Typography } from '@mui/material'
import AppShell from '../components/AppShell'
import PageHeader from '../components/PageHeader'
import { PALETTE } from '../styles/palette'

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

export default function TermsPage() {
  return (
    <AppShell maxWidth="sm">
      <PageHeader
        title="Điều khoản sử dụng & Chính sách bảo mật"
        subtitle="Vui lòng đọc kỹ trước khi tiếp tục sử dụng ứng dụng."
      />

      <Stack spacing={3}>
        {SECTIONS.map(section => (
          <Stack key={section.title} spacing={0.5}>
            <Typography variant="h6" sx={{ fontWeight: 700, color: PALETTE.textPrimary }}>
              {section.title}
            </Typography>
            <Typography variant="body2" sx={{ color: PALETTE.textSecondary, lineHeight: 1.7 }}>
              {section.body}
            </Typography>
          </Stack>
        ))}
      </Stack>
    </AppShell>
  )
}
