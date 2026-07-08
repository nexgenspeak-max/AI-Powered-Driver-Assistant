import { Link, useLocation } from 'react-router-dom'
import { Box, Divider, Drawer, IconButton, List, ListItemButton, ListItemIcon, ListItemText, Typography } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import { NAV_ITEMS } from '../navItems'
import { PALETTE } from '../../../styles/palette'

type MobileNavDrawerProps = {
  open: boolean
  onClose: () => void
}

export default function MobileNavDrawer({ open, onClose }: MobileNavDrawerProps) {
  const { pathname } = useLocation()

  return (
    <Drawer
      anchor="left"
      open={open}
      onClose={onClose}
      slotProps={{
        paper: {
          sx: {
            width: 280,
            background: `linear-gradient(180deg, ${PALETTE.darkest} 0%, ${PALETTE.base} 100%)`,
            color: '#fff',
          },
        },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2.5, py: 2.5 }}>
        <Typography sx={{ fontWeight: 800, fontSize: 18 }}>Czen.</Typography>
        <IconButton size="small" onClick={onClose} sx={{ color: 'rgba(255,255,255,0.7)', '&:hover': { color: '#fff' } }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)', mx: 2 }} />

      <List sx={{ px: 1.5, pt: 1.5 }}>
        {NAV_ITEMS.map(item => {
          const Icon = item.icon
          const active = pathname === item.to
          return (
            <ListItemButton
              key={item.to}
              component={Link}
              to={item.to}
              onClick={onClose}
              sx={{
                borderRadius: 2, mb: 0.5,
                bgcolor: active ? 'rgba(255,255,255,0.14)' : 'transparent',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.08)' },
              }}
            >
              <ListItemIcon sx={{ minWidth: 36, color: active ? '#fff' : 'rgba(255,255,255,0.6)' }}>
                <Icon fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary={item.label}
                slotProps={{ primary: { style: { fontSize: 14, fontWeight: active ? 700 : 500, color: active ? '#fff' : 'rgba(255,255,255,0.85)' } } }}
              />
            </ListItemButton>
          )
        })}
      </List>
    </Drawer>
  )
}
