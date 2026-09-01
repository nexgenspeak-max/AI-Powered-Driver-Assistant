import { CardContent, Divider, ListItemButton, ListItemIcon, ListItemText, Stack, Typography } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import CallIcon from '@mui/icons-material/Call'
import EmailIcon from '@mui/icons-material/Email'
import HelpOutlineRoundedIcon from '@mui/icons-material/HelpOutlineRounded'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import AppShell from '../components/AppShell'
import PageHeader from '../components/PageHeader'
import SurfaceCard from '../components/SurfaceCard'
import { PALETTE } from '../styles/palette'

const SUPPORT_PHONE = '19001234'
const SUPPORT_EMAIL = 'support@czen.vn'

export default function SupportPage() {
  return (
    <AppShell maxWidth="sm">
      <PageHeader
        title="Hỗ trợ"
        subtitle="Cần giúp đỡ? Liên hệ với đội ngũ hỗ trợ của chúng tôi qua các kênh bên dưới, hoặc xem câu hỏi thường gặp."
      />

      <SurfaceCard sx={{ overflow: 'hidden' }}>
        <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
          <ListItemButton component="a" href={`tel:${SUPPORT_PHONE}`} sx={{ minHeight: 56 }}>
            <ListItemIcon sx={{ minWidth: 40 }}>
              <CallIcon sx={{ color: PALETTE.success }} />
            </ListItemIcon>
            <ListItemText primary="Hotline hỗ trợ" secondary={SUPPORT_PHONE} />
          </ListItemButton>
          <Divider />
          <ListItemButton component="a" href={`mailto:${SUPPORT_EMAIL}`} sx={{ minHeight: 56 }}>
            <ListItemIcon sx={{ minWidth: 40 }}>
              <EmailIcon sx={{ color: PALETTE.primary }} />
            </ListItemIcon>
            <ListItemText primary="Email hỗ trợ" secondary={SUPPORT_EMAIL} />
          </ListItemButton>
          <Divider />
          <ListItemButton component={RouterLink} to="/faq" sx={{ minHeight: 56 }}>
            <ListItemIcon sx={{ minWidth: 40 }}>
              <HelpOutlineRoundedIcon sx={{ color: PALETTE.warning }} />
            </ListItemIcon>
            <ListItemText primary="Câu hỏi thường gặp" />
            <ChevronRightIcon sx={{ color: PALETTE.textMuted }} />
          </ListItemButton>
        </CardContent>
      </SurfaceCard>

      <Stack spacing={1} sx={{ mt: 3 }}>
        <Typography variant="body2" sx={{ color: PALETTE.textSecondary }}>
          Hotline hoạt động 24/7 cho các vấn đề khẩn cấp liên quan đến chuyến đi.
        </Typography>
        <Typography variant="body2" sx={{ color: PALETTE.textSecondary }}>
          Email phản hồi trong vòng 24 giờ làm việc.
        </Typography>
      </Stack>
    </AppShell>
  )
}
