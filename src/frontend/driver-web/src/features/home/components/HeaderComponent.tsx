import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Box, Button, IconButton, Menu, Tooltip, Typography } from '@mui/material'
import MenuIcon from '@mui/icons-material/Menu'
import LogoutIcon from '@mui/icons-material/Logout'
import { useAuthStore } from '../../../stores/authStore'
import { driversService } from '../../../services/api/drivers'
import { PALETTE } from '../../../styles/palette'
import { NAV_ITEMS } from '../navItems'
import MobileNavDrawer from './MobileNavDrawer'

export default function HeaderComponent() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const driver = useAuthStore(s => s.driver)!
  const setDriver = useAuthStore(s => s.setDriver)
  const logout = useAuthStore(s => s.logout)
  const qc = useQueryClient()

  const [profileAnchor, setProfileAnchor] = useState<null | HTMLElement>(null)
  const [navOpen, setNavOpen] = useState(false)
  const isOnline = driver.status === 'online'

  const { mutate: toggleOnline, isPending } = useMutation({
    mutationFn: (online: boolean) =>
      driversService.update(driver.phone, { status: online ? 'online' : 'offline' }),
    onSuccess: d => { setDriver(d); qc.invalidateQueries({ queryKey: ['trips', 'driver'] }) },
  })

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const pillBtnSx = {
    px: { xs: 1.5, sm: 2 }, py: 0.75, borderRadius: 999, minWidth: 0,
    fontSize: { xs: 12.5, sm: 14 }, fontWeight: 700, textTransform: 'none' as const, lineHeight: 1,
  }

  return (
    <Box sx={{
      display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 2 }, px: { xs: 1.5, sm: 3 }, py: 1.5,
      background: `linear-gradient(150deg, ${PALETTE.darkest} 0%, ${PALETTE.base} 55%, ${PALETTE.mid} 100%)`,
      position: 'sticky', top: 0, zIndex: 10,
    }}>
      <IconButton
        onClick={() => setNavOpen(true)}
        sx={{ display: { xs: 'inline-flex', sm: 'inline-flex', md: 'none' }, color: '#fff', p: 0.75 }}
      >
        <MenuIcon />
      </IconButton>

      <Typography
        component={Link}
        to="/"
        sx={{
          fontWeight: 800, fontSize: { xs: 16, sm: 19 }, letterSpacing: '-0.01em',
          color: '#fff', textDecoration: 'none', flexShrink: 0,
        }}
      >
        Czen Driver.
      </Typography>

      <Box sx={{ flex: 1, display: { xs: 'none', sm: 'none', md: 'flex' }, justifyContent: 'center', minWidth: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, p: 0.5, borderRadius: 999, bgcolor: 'rgba(255,255,255,0.1)' }}>
          {NAV_ITEMS.map(item => {
            const Icon = item.icon
            const active = pathname === item.to
            return (
              <Box
                key={item.to}
                component={Link}
                to={item.to}
                sx={{
                  display: 'flex', alignItems: 'center', gap: 0.75,
                  px: 2.25, py: 0.75, borderRadius: 999,
                  fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap',
                  textDecoration: 'none', transition: 'all 0.15s ease',
                  color: active ? PALETTE.darkest : 'rgba(255,255,255,0.75)',
                  bgcolor: active ? '#fff' : 'transparent',
                  '&:hover': { bgcolor: active ? '#fff' : 'rgba(255,255,255,0.14)', color: active ? PALETTE.darkest : '#fff' },
                }}
              >
                <Icon sx={{ fontSize: 17 }} />
                {item.label}
              </Box>
            )
          })}
        </Box>
      </Box>

      <MobileNavDrawer open={navOpen} onClose={() => setNavOpen(false)} />

      <Box sx={{ flex: { xs: 1, sm: 1, md: 0 }, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: { xs: 0.75, sm: 1 }, flexShrink: 0 }}>
        <Box
          onClick={e => setProfileAnchor(e.currentTarget)}
          sx={{
            width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            bgcolor: 'rgba(255,255,255,0.15)', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer',
            border: '1px solid rgba(255,255,255,0.3)', transition: 'all 0.15s ease', flexShrink: 0,
            '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' },
          }}
        >
          {driver.name.charAt(0).toUpperCase()}
        </Box>
        <Menu
          anchorEl={profileAnchor}
          open={!!profileAnchor}
          onClose={() => setProfileAnchor(null)}
          slotProps={{ paper: { sx: { mt: 1, borderRadius: 2, minWidth: 200, boxShadow: `0 8px 24px ${PALETTE.base}26` } } }}
        >
          <Box sx={{ px: 2, py: 1.25 }}>
            <Typography sx={{ fontWeight: 700, fontSize: 14, color: PALETTE.ink }}>{driver.name}</Typography>
            <Typography variant="caption" sx={{ color: PALETTE.gray }}>{driver.phone}</Typography>
          </Box>
        </Menu>

        <Button
          onClick={() => toggleOnline(!isOnline)}
          disabled={isPending}
          startIcon={
            <Box sx={{
              width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
              bgcolor: isOnline ? '#4ade80' : '#9ca3af',
              boxShadow: isOnline ? '0 0 0 3px rgba(74,222,128,0.25)' : 'none',
            }} />
          }
          sx={{
            ...pillBtnSx,
            color: '#fff', border: '1px solid rgba(255,255,255,0.4)',
            '&:hover': { bgcolor: 'rgba(255,255,255,0.1)', borderColor: '#fff' },
          }}
        >
          {isOnline ? 'Online' : 'Offline'}
        </Button>

        <Tooltip title="Đăng xuất">
          <IconButton
            onClick={handleLogout}
            sx={{
              width: 36, height: 36, bgcolor: 'rgba(255,255,255,0.12)', color: '#fff',
              border: '1px solid rgba(255,255,255,0.25)',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.22)' },
            }}
          >
            <LogoutIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  )
}
