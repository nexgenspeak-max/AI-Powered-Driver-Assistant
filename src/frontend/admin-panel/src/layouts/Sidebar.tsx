import { useLocation, Link } from 'react-router-dom'
import {
  Box, Drawer, List, ListItemButton, ListItemIcon, ListItemText, Divider, Typography,
} from '@mui/material'
import DashboardIcon from '@mui/icons-material/Dashboard'
import AddIcon from '@mui/icons-material/Add'
import PeopleAltIcon from '@mui/icons-material/PeopleAlt'
import LocalTaxiIcon from '@mui/icons-material/LocalTaxi'
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar'
import PhoneInTalkIcon from '@mui/icons-material/PhoneInTalk'
import { ROUTES } from '../constants'
import { PALETTE } from '../styles/palette'

const DRAWER_WIDTH = 240

const NAV_ITEMS = [
  { to: ROUTES.TRIP_BOARD,  icon: <DashboardIcon fontSize="small" />,  label: 'Trip Board' },
  { to: ROUTES.CREATE_TRIP, icon: <AddIcon fontSize="small" />,        label: 'New Trip'   },
  { to: ROUTES.DRIVERS,     icon: <LocalTaxiIcon fontSize="small" />,  label: 'Drivers'    },
  { to: ROUTES.CUSTOMERS,   icon: <PeopleAltIcon fontSize="small" />,  label: 'Customer'   },
  { to: ROUTES.CALL_LOGS,   icon: <PhoneInTalkIcon fontSize="small" />, label: 'Call Logs'  },
]

const drawerPaperSx = {
  width: DRAWER_WIDTH, boxSizing: 'border-box' as const, color: '#fff', borderRight: 'none',
  background: `linear-gradient(180deg, ${PALETTE.darkest} 0%, ${PALETTE.base} 100%)`,
}

function SidebarContent({ onNavigate }: { onNavigate: () => void }) {
  const { pathname } = useLocation()
  return (
    <>
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
              onClick={onNavigate}
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
    </>
  )
}

type SidebarProps = {
  mobileOpen: boolean
  onClose: () => void
}

export function Sidebar({ mobileOpen, onClose }: SidebarProps) {
  return (
    <>
      {/* Mobile/tablet: overlay drawer toggled by the hamburger icon, doesn't reserve layout space */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onClose}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', sm: 'block', md: 'none' },
          '& .MuiDrawer-paper': drawerPaperSx,
        }}
      >
        <SidebarContent onNavigate={onClose} />
      </Drawer>

      {/* Desktop: always-visible drawer that reserves layout space */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', sm: 'none', md: 'block' },
          width: DRAWER_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': drawerPaperSx,
        }}
      >
        <SidebarContent onNavigate={() => {}} />
      </Drawer>
    </>
  )
}
