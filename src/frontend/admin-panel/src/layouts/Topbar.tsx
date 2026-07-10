import { useNavigate } from 'react-router-dom'
import { AppBar, Toolbar, Typography, IconButton, Avatar, Box, Tooltip } from '@mui/material'
import MenuIcon from '@mui/icons-material/Menu'
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone'
import LogoutIcon from '@mui/icons-material/Logout'
import { ROUTES } from '../constants'
import { PALETTE } from '../styles/palette'
import { useAuthStore } from '../stores/authStore'

type TopbarProps = {
  title: string
  onMenuClick: () => void
}

export function Topbar({ title, onMenuClick }: TopbarProps) {
  const navigate = useNavigate()
  const admin = useAuthStore(s => s.admin)
  const logout = useAuthStore(s => s.logout)

  const handleLogout = () => {
    logout()
    navigate(ROUTES.LOGIN)
  }

  const initial = admin?.name ? admin.name.trim().charAt(0).toUpperCase() : 'A'

  return (
    <AppBar position="sticky" elevation={0} sx={{ top: 0, bgcolor: '#fff', boxShadow: `0 1px 3px ${PALETTE.base}14`, color: 'inherit' }}>
      <Toolbar sx={{ minHeight: '60px !important', px: 3 }}>
        <IconButton
          onClick={onMenuClick}
          sx={{ display: { xs: 'inline-flex', sm: 'inline-flex', md: 'none' }, mr: 1.5, color: 'text.secondary' }}
        >
          <MenuIcon />
        </IconButton>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, flex: 1 }}>{title}</Typography>
        <IconButton size="small" sx={{ mr: 1, color: 'text.secondary', '&:hover': { bgcolor: PALETTE.chipBg } }}>
          <NotificationsNoneIcon />
        </IconButton>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: { xs: 0, sm: 0, md: 1.5 }, py: 0.75, borderRadius: 2 }}>
          <Avatar sx={{
            width: 32, height: 32, fontSize: 14, fontWeight: 700,
            background: `linear-gradient(135deg, ${PALETTE.base} 0%, ${PALETTE.mid} 100%)`,
          }}>{initial}</Avatar>
          <Box sx={{ display: { xs: 'none', sm: 'none', md: 'block' } }}>
            <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.2 }}>{admin?.name ?? 'Admin'}</Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>{admin?.email ?? 'Dispatcher'}</Typography>
          </Box>
        </Box>
        <Tooltip title="Đăng xuất">
          <IconButton size="small" onClick={handleLogout} sx={{ ml: 0.5, color: 'text.secondary', '&:hover': { bgcolor: PALETTE.chipBg } }}>
            <LogoutIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Toolbar>
    </AppBar>
  )
}
