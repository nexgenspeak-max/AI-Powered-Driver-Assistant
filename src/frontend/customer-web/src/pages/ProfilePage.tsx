import { useState } from 'react'
import {
  Avatar,
  Box,
  Button,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined'
import SupportAgentOutlinedIcon from '@mui/icons-material/SupportAgentOutlined'
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined'
import CardGiftcardOutlinedIcon from '@mui/icons-material/CardGiftcardOutlined'
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import AppShell from '../components/AppShell'
import PageHeader from '../components/PageHeader'
import SurfaceCard from '../components/SurfaceCard'
import { useCurrentUser } from '../features/auth/hooks/useCurrentUser'
import { useAuthStore } from '../stores/authStore'
import { PALETTE } from '../styles/palette'

function MenuRow({
  to,
  icon,
  label,
  labelColor = PALETTE.textPrimary,
  onClick,
}: {
  to?: string
  icon: React.ReactNode
  label: string
  labelColor?: string
  onClick?: () => void
}) {
  return (
    <ListItemButton
      component={to ? RouterLink : 'button'}
      to={to}
      onClick={onClick}
      sx={{ minHeight: 56, px: 2 }}
    >
      <ListItemIcon sx={{ minWidth: 40, color: PALETTE.textSecondary }}>{icon}</ListItemIcon>
      <ListItemText
        primary={label}
        slotProps={{ primary: { sx: { fontWeight: 500, color: labelColor } } }}
      />
      {to ? <ChevronRightIcon sx={{ color: PALETTE.textMuted }} /> : null}
    </ListItemButton>
  )
}

export default function ProfilePage() {
  const navigate = useNavigate()
  const { data: customer } = useCurrentUser()
  const logout = useAuthStore(s => s.logout)
  const [logoutOpen, setLogoutOpen] = useState(false)

  if (!customer) return null

  const avatarLetter = customer.name.trim().charAt(0).toUpperCase() || 'K'

  return (
    <AppShell maxWidth="md">
      <PageHeader title="Hồ sơ" subtitle="Quản lý thông tin tài khoản và cài đặt hỗ trợ." />

      <Stack spacing={3}>
        <SurfaceCard>
          <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
            <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
              <Avatar sx={{ width: 72, height: 72, bgcolor: PALETTE.primary, fontSize: '1.75rem', fontWeight: 700 }}>
                {avatarLetter}
              </Avatar>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>{customer.name}</Typography>
                <Typography variant="body2" sx={{ color: PALETTE.textSecondary }}>{customer.phone}</Typography>
              </Box>
            </Stack>
          </CardContent>
        </SurfaceCard>

        <SurfaceCard sx={{ overflow: 'hidden' }}>
          <Typography variant="caption" sx={{ display: 'block', px: 2, pt: 2, pb: 1, color: PALETTE.textMuted, fontWeight: 700, letterSpacing: 0.5 }}>
            TÀI KHOẢN
          </Typography>
          <MenuRow to="/edit-profile" icon={<EditOutlinedIcon />} label="Chỉnh sửa hồ sơ" />
        </SurfaceCard>

        <SurfaceCard sx={{ overflow: 'hidden' }}>
          <Typography variant="caption" sx={{ display: 'block', px: 2, pt: 2, pb: 1, color: PALETTE.textMuted, fontWeight: 700, letterSpacing: 0.5 }}>
            HỖ TRỢ & PHÁP LÝ
          </Typography>
          <MenuRow to="/safety" icon={<ShieldOutlinedIcon />} label="Trung tâm an toàn" />
          <Divider />
          <MenuRow to="/support" icon={<SupportAgentOutlinedIcon />} label="Hỗ trợ" />
          <Divider />
          <MenuRow to="/terms" icon={<DescriptionOutlinedIcon />} label="Điều khoản & Chính sách bảo mật" />
          <Divider />
          <MenuRow to="/referral" icon={<CardGiftcardOutlinedIcon />} label="Giới thiệu bạn bè" />
        </SurfaceCard>

        <SurfaceCard sx={{ overflow: 'hidden' }}>
          <MenuRow
            icon={<LogoutOutlinedIcon sx={{ color: PALETTE.danger }} />}
            label="Đăng xuất"
            labelColor={PALETTE.danger}
            onClick={() => setLogoutOpen(true)}
          />
        </SurfaceCard>
      </Stack>

      <Dialog open={logoutOpen} onClose={() => setLogoutOpen(false)}>
        <DialogTitle>Đăng xuất?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Bạn sẽ cần đăng nhập lại để tiếp tục sử dụng ứng dụng.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLogoutOpen(false)}>Ở lại</Button>
          <Button
            color="error"
            onClick={() => {
              setLogoutOpen(false)
              logout()
              navigate('/login')
            }}
          >
            Đăng xuất
          </Button>
        </DialogActions>
      </Dialog>
    </AppShell>
  )
}
