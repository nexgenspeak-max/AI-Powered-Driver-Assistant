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
import { useMutation } from '@tanstack/react-query'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import DirectionsCarOutlinedIcon from '@mui/icons-material/DirectionsCarOutlined'
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined'
import SupportAgentOutlinedIcon from '@mui/icons-material/SupportAgentOutlined'
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined'
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import StarIcon from '@mui/icons-material/Star'
import AppShell from '../components/AppShell'
import PageHeader from '../components/PageHeader'
import SurfaceCard from '../components/SurfaceCard'
import { useCurrentUser } from '../features/auth/hooks/useCurrentUser'
import { useDriverContext } from '../features/dashboard/hooks/useDriverContext'
import { driversService } from '../services/api/drivers'
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
  const { data: driver } = useCurrentUser()
  const { data: context, isError, refetch } = useDriverContext()
  const logout = useAuthStore(s => s.logout)
  const [logoutOpen, setLogoutOpen] = useState(false)

  const { mutate: logoutAndGoOffline, isPending: loggingOut } = useMutation({
    mutationFn: async () => {
      if (driver && driver.status === 'online') {
        await driversService.update(driver.phone, { status: 'offline' }).catch(() => {})
      }
    },
    onSettled: () => {
      setLogoutOpen(false)
      logout()
      navigate('/login')
    },
  })

  if (!driver) return null

  const profile = context?.driver_profile
  const avatarLetter = driver.name.trim().charAt(0).toUpperCase() || 'T'

  return (
    <AppShell maxWidth="md">
      <PageHeader title="Hồ sơ" subtitle="Quản lý thông tin tài khoản, xe và cài đặt hỗ trợ." />

      <Stack spacing={3}>
        <SurfaceCard>
          <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
            <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
              <Avatar sx={{ width: 72, height: 72, bgcolor: PALETTE.primary, fontSize: '1.75rem', fontWeight: 700 }}>
                {avatarLetter}
              </Avatar>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>{driver.name}</Typography>
                <Typography variant="body2" sx={{ color: PALETTE.textSecondary }}>{driver.phone}</Typography>
                {driver.email ? (
                  <Typography variant="body2" sx={{ color: PALETTE.textMuted }}>{driver.email}</Typography>
                ) : null}
              </Box>
            </Stack>

            {profile ? (
              <Stack direction="row" spacing={3} sx={{ mt: 3 }}>
                <Box>
                  <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                    <StarIcon sx={{ fontSize: 18, color: PALETTE.warning }} />
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>{profile.rating.toFixed(1)}</Typography>
                  </Stack>
                  <Typography variant="caption" sx={{ color: PALETTE.textMuted }}>Đánh giá</Typography>
                </Box>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>{profile.total_trips}</Typography>
                  <Typography variant="caption" sx={{ color: PALETTE.textMuted }}>Tổng chuyến</Typography>
                </Box>
              </Stack>
            ) : isError ? (
              <Button size="small" onClick={() => refetch()} sx={{ mt: 2 }}>
                Không tải được thống kê — thử lại
              </Button>
            ) : null}
          </CardContent>
        </SurfaceCard>

        <SurfaceCard sx={{ overflow: 'hidden' }}>
          <Typography variant="caption" sx={{ display: 'block', px: 2, pt: 2, pb: 1, color: PALETTE.textMuted, fontWeight: 700, letterSpacing: 0.5 }}>
            TÀI KHOẢN
          </Typography>
          <MenuRow to="/edit-profile" icon={<EditOutlinedIcon />} label="Chỉnh sửa hồ sơ" />
          <Divider />
          <MenuRow to="/vehicle" icon={<DirectionsCarOutlinedIcon />} label="Quản lý xe" />
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

      <Dialog open={logoutOpen} onClose={() => !loggingOut && setLogoutOpen(false)}>
        <DialogTitle>Đăng xuất?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Bạn sẽ cần đăng nhập lại để tiếp tục sử dụng ứng dụng.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLogoutOpen(false)} disabled={loggingOut}>Ở lại</Button>
          <Button color="error" onClick={() => logoutAndGoOffline()} disabled={loggingOut}>
            {loggingOut ? 'Đang đăng xuất...' : 'Đăng xuất'}
          </Button>
        </DialogActions>
      </Dialog>
    </AppShell>
  )
}
