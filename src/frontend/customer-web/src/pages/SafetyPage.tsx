import { CardContent, Divider, ListItemButton, ListItemIcon, ListItemText, Stack, Typography } from '@mui/material'
import CallIcon from '@mui/icons-material/Call'
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined'
import AppShell from '../components/AppShell'
import PageHeader from '../components/PageHeader'
import SurfaceCard from '../components/SurfaceCard'
import { PALETTE } from '../styles/palette'

const EMERGENCY_NUMBERS = [
  { label: 'Công an', number: '113' },
  { label: 'Cấp cứu y tế', number: '115' },
  { label: 'Phòng cháy chữa cháy', number: '114' },
]

const SAFETY_TIPS = [
  'Luôn kiểm tra biển số xe và tên tài xế trên app khớp với xe thực tế trước khi lên xe.',
  'Chia sẻ chuyến đi của bạn với người thân qua ứng dụng nhắn tin trước khi khởi hành.',
  'Thắt dây an toàn trong suốt chuyến đi.',
  'Nếu cảm thấy không an toàn, hãy yêu cầu tài xế dừng xe ở nơi đông người và liên hệ khẩn cấp ngay.',
]

export default function SafetyPage() {
  return (
    <AppShell maxWidth="sm">
      <PageHeader title="Trung tâm an toàn" subtitle="Số khẩn cấp và mẹo an toàn khi đi xe." />

      <Stack spacing={3}>
        <SurfaceCard sx={{ overflow: 'hidden' }}>
          <Typography variant="caption" sx={{ display: 'block', px: 2, pt: 2, pb: 1, color: PALETTE.textMuted, fontWeight: 700 }}>
            GỌI KHẨN CẤP
          </Typography>
          <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
            {EMERGENCY_NUMBERS.map((item, i) => (
              <div key={item.number}>
                <ListItemButton component="a" href={`tel:${item.number}`} sx={{ minHeight: 56 }}>
                  <ListItemIcon sx={{ minWidth: 40 }}>
                    <CallIcon sx={{ color: PALETTE.danger }} />
                  </ListItemIcon>
                  <ListItemText primary={item.label} />
                  <Typography variant="body1" sx={{ fontWeight: 700, color: PALETTE.textSecondary }}>
                    {item.number}
                  </Typography>
                </ListItemButton>
                {i < EMERGENCY_NUMBERS.length - 1 ? <Divider /> : null}
              </div>
            ))}
          </CardContent>
        </SurfaceCard>

        <SurfaceCard>
          <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
            <Typography variant="caption" sx={{ color: PALETTE.textMuted, fontWeight: 700, display: 'block', mb: 2 }}>
              MẸO AN TOÀN KHI ĐI XE
            </Typography>
            <Stack spacing={2}>
              {SAFETY_TIPS.map((tip, i) => (
                <Stack key={i} direction="row" spacing={1.5} sx={{ alignItems: 'flex-start' }}>
                  <ShieldOutlinedIcon sx={{ fontSize: 18, color: PALETTE.success, mt: 0.25 }} />
                  <Typography variant="body2" sx={{ color: PALETTE.textPrimary, flex: 1 }}>
                    {tip}
                  </Typography>
                </Stack>
              ))}
            </Stack>
          </CardContent>
        </SurfaceCard>
      </Stack>
    </AppShell>
  )
}
