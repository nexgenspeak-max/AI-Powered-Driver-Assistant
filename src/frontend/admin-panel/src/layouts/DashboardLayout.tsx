import { useLocation, Link } from 'react-router-dom'
import {
  Box, Drawer, AppBar, Toolbar, Typography, List, ListItemButton,
  ListItemIcon, ListItemText, Avatar, IconButton, Divider,
} from '@mui/material'
import DashboardIcon from '@mui/icons-material/Dashboard'
import AddIcon from '@mui/icons-material/Add'
import PeopleAltIcon from '@mui/icons-material/PeopleAlt'
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone'
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar'
import PhoneInTalkIcon from '@mui/icons-material/PhoneInTalk'
import { ROUTES, PAGE_TITLES } from '../constants'

const DRAWER_WIDTH = 240

const NAV_ITEMS = [
  { to: ROUTES.TRIP_BOARD,  icon: <DashboardIcon fontSize="small" />,   label: 'Trip Board' },
  { to: ROUTES.CREATE_TRIP, icon: <AddIcon fontSize="small" />,          label: 'New Trip'   },
  { to: ROUTES.DRIVERS,     icon: <PeopleAltIcon fontSize="small" />,    label: 'Drivers'    },
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
        '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box', bgcolor: '#1a1f36', color: '#fff', borderRight: 'none' },
      }}
    >
      <Box sx={{ px: 3, py: 2.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <DirectionsCarIcon sx={{ color: '#6c8aff', fontSize: 28 }} />
        <Box>
          <Typography variant="subtitle2" sx={{ color: '#fff', fontWeight: 700, lineHeight: 1.2 }}>Driver Assistant</Typography>
          <Typography variant="caption" sx={{ color: '#8b9abf' }}>Admin Panel</Typography>
        </Box>
      </Box>

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)', mx: 2 }} />

      <Typography variant="caption" sx={{ color: '#8b9abf', px: 3, pt: 2.5, pb: 0.5, letterSpacing: 1, textTransform: 'uppercase', display: 'block' }}>
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
                bgcolor: active ? 'rgba(108,138,255,0.15)' : 'transparent',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.07)' },
              }}
            >
              <ListItemIcon sx={{ minWidth: 36, color: active ? '#6c8aff' : '#8b9abf' }}>{icon}</ListItemIcon>
              <ListItemText
                primary={label}
                slotProps={{ primary: { style: { fontSize: 14, fontWeight: active ? 600 : 400, color: active ? '#fff' : '#c0cae0' } } }}
              />
              {active && <Box sx={{ width: 3, height: 20, bgcolor: '#6c8aff', borderRadius: 2 }} />}
            </ListItemButton>
          )
        })}
      </List>

      <Box sx={{ mt: 'auto', px: 3, py: 2, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <Typography variant="caption" sx={{ color: '#8b9abf' }}>v1.0.0 · Local dev</Typography>
      </Box>
    </Drawer>
  )
}

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation()
  const title = PAGE_TITLES[pathname] ?? 'Admin'

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <Sidebar />
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <AppBar position="static" elevation={0} sx={{ bgcolor: '#fff', borderBottom: '1px solid #e8eaf0', color: 'inherit' }}>
          <Toolbar sx={{ minHeight: '56px !important', px: 3 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, flex: 1 }}>{title}</Typography>
            <IconButton size="small" sx={{ mr: 1, color: 'text.secondary' }}>
              <NotificationsNoneIcon />
            </IconButton>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer', px: 1.5, py: 0.75, borderRadius: 2, '&:hover': { bgcolor: '#f5f6fa' } }}>
              <Avatar sx={{ width: 32, height: 32, bgcolor: '#6c8aff', fontSize: 14, fontWeight: 700 }}>A</Avatar>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.2 }}>Admin</Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>Dispatcher</Typography>
              </Box>
            </Box>
          </Toolbar>
        </AppBar>
        <Box component="main" sx={{ flex: 1, p: 3, overflow: 'auto' }}>{children}</Box>
      </Box>
    </Box>
  )
}
