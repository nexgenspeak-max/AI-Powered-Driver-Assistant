import { useLocation, useNavigate, Link } from 'react-router-dom'
import {
  Box, Drawer, AppBar, Toolbar, Typography, List, ListItemButton,
  ListItemIcon, ListItemText, Avatar, IconButton, Divider, Tooltip,
} from '@mui/material'
import DashboardIcon from '@mui/icons-material/Dashboard'
import AddIcon from '@mui/icons-material/Add'
import PeopleAltIcon from '@mui/icons-material/PeopleAlt'
import LocalTaxiIcon from '@mui/icons-material/LocalTaxi';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone'
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar'
import PhoneInTalkIcon from '@mui/icons-material/PhoneInTalk'
import LogoutIcon from '@mui/icons-material/Logout'
import { ROUTES, PAGE_TITLES } from '../constants'
import { PALETTE } from '../styles/palette'
import { useAuthStore } from '../stores/authStore'


const DRAWER_WIDTH = 240

const NAV_ITEMS = [
  { to: ROUTES.TRIP_BOARD,  icon: <DashboardIcon fontSize="small" />,   label: 'Trip Board' },
  { to: ROUTES.CREATE_TRIP, icon: <AddIcon fontSize="small" />,          label: 'New Trip'   },
  { to: ROUTES.DRIVERS,     icon: <LocalTaxiIcon fontSize="small" />,    label: 'Drivers'    },
  { to: ROUTES.CUSTOMERS,     icon: <PeopleAltIcon fontSize="small" />,    label: 'Customer'    },

  { to: ROUTES.CALL_LOGS,   icon: <PhoneInTalkIcon fontSize="small" />,  label: 'Call Logs'  },
]

function Sidebar() {
  const { pathname } = useLocation()
  return (
    <Drawer
      variant="permanent"
      sx={{
        width: DRAWER_WIDTH,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: DRAWER_WIDTH, boxSizing: 'border-box', color: '#fff', borderRight: 'none',
          background: `linear-gradient(180deg, ${PALETTE.darkest} 0%, ${PALETTE.base} 100%)`,
        },
      }}
    >
      <Box sx={{ px: 3, py: 2.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box sx={{
          width: 36, height: 36, borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: `linear-gradient(135deg, ${PALETTE.light} 0%, ${PALETTE.mid} 100%)`,
        }}>
          <DirectionsCarIcon sx={{ color: '#fff', fontSize: 20 }} />
        </Box>
        <Box>
          <Typography variant="subtitle2" sx={{ color: '#fff', fontWeight: 700, lineHeight: 1.2 }}>Driver Assistant</Typography>
          <Typography variant="caption" sx={{ color: PALETTE.light }}>Admin Panel</Typography>
        </Box>
      </Box>

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)', mx: 2 }} />

      <Typography variant="caption" sx={{ color: PALETTE.light, px: 3, pt: 2.5, pb: 0.5, letterSpacing: 1, textTransform: 'uppercase', display: 'block' }}>
        Main
      </Typography>

      <List dense sx={{ px: 1.5, pt: 0.5 }}>
        {NAV_ITEMS.map(({ to, icon, label }) => {
          const active = pathname === to
          return (
            <ListItemButton
              key={to}
              component={Link}
              to={to}
              sx={{
                borderRadius: 2, mb: 0.5,
                bgcolor: active ? 'rgba(255,255,255,0.14)' : 'transparent',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.08)' },
              }}
            >
              <ListItemIcon sx={{ minWidth: 36, color: active ? '#fff' : PALETTE.light }}>{icon}</ListItemIcon>
              <ListItemText
                primary={label}
                slotProps={{ primary: { style: { fontSize: 14, fontWeight: active ? 600 : 400, color: active ? '#fff' : '#d9cdec' } } }}
              />
              {active && <Box sx={{ width: 3, height: 20, bgcolor: PALETTE.light, borderRadius: 2 }} />}
            </ListItemButton>
          )
        })}
      </List>

      <Box sx={{ mt: 'auto', px: 3, py: 2, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        <Typography variant="caption" sx={{ color: PALETTE.light }}>v1.0.0 · Local dev</Typography>
      </Box>
    </Drawer>
  )
}

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const title = PAGE_TITLES[pathname] ?? 'Admin'
  const admin = useAuthStore(s => s.admin)
  const logout = useAuthStore(s => s.logout)

  const handleLogout = () => {
    logout()
    navigate(ROUTES.LOGIN)
  }

  const initial = admin?.name ? admin.name.trim().charAt(0).toUpperCase() : 'A'

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <Sidebar />
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <AppBar position="static" elevation={0} sx={{ bgcolor: '#fff', boxShadow: `0 1px 3px ${PALETTE.base}14`, color: 'inherit' }}>
          <Toolbar sx={{ minHeight: '60px !important', px: 3 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, flex: 1 }}>{title}</Typography>
            <IconButton size="small" sx={{ mr: 1, color: 'text.secondary', '&:hover': { bgcolor: PALETTE.chipBg } }}>
              <NotificationsNoneIcon />
            </IconButton>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1.5, py: 0.75, borderRadius: 2 }}>
              <Avatar sx={{
                width: 32, height: 32, fontSize: 14, fontWeight: 700,
                background: `linear-gradient(135deg, ${PALETTE.base} 0%, ${PALETTE.mid} 100%)`,
              }}>{initial}</Avatar>
              <Box>
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
        <Box component="main" sx={{ flex: 1, p: 3, overflow: 'auto' }}>{children}</Box>
      </Box>
    </Box>
  )
}
