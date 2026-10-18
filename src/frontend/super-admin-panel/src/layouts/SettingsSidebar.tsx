import { useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  Avatar,
  Box,
  Drawer,
  IconButton,
  InputAdornment,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import LogoutIcon from '@mui/icons-material/Logout'
import SearchIcon from '@mui/icons-material/Search'
import MenuIcon from '@mui/icons-material/Menu'
import { ROUTES } from '../constants/routes'
import { PALETTE } from '../styles/palette'
import { useAuthStore } from '../stores/authStore'
import { OPS_NAV_GROUPS } from './navRegistry'
import { filterOpsNavItems, groupLabel, navItemLabel } from '../i18n/navText'
import { useOpsLocale } from '../i18n/useOpsLocale'
import { LocalePicker } from '../components/LocalePicker'
import { VoiceTreeNav } from './VoiceTreeNav'

export const SETTINGS_SIDEBAR_WIDTH = 272

const drawerPaperSx = {
  width: SETTINGS_SIDEBAR_WIDTH,
  boxSizing: 'border-box' as const,
  bgcolor: PALETTE.shellSidebar,
  color: PALETTE.shellText,
  borderRight: `1px solid ${PALETTE.shellBorder}`,
}

function NavList({ onNavigate, query }: { onNavigate: () => void; query: string }) {
  const { pathname } = useLocation()
  const { locale, t } = useOpsLocale()
  const filtered = useMemo(() => filterOpsNavItems(query, locale), [query, locale])
  const byGroup = OPS_NAV_GROUPS.map(g => ({
    ...g,
    items: filtered.filter(i => i.group === g.id),
  })).filter(g => g.items.length > 0)

  return (
    <Box sx={{ flex: 1, overflow: 'auto', px: 1.5, pb: 2 }}>
      {byGroup.map(group => (
        <Box key={group.id} sx={{ mb: 1.5 }}>
          <Typography
            variant="caption"
            sx={{
              px: 1.5,
              py: 1,
              display: 'block',
              color: PALETTE.shellMuted,
              fontWeight: 600,
              letterSpacing: 0.4,
              textTransform: 'uppercase',
              fontSize: 11,
            }}
          >
            {groupLabel(group.id, locale)}
          </Typography>
          {group.id === 'agent' && !query.trim() ? (
            <VoiceTreeNav onNavigate={onNavigate} />
          ) : (
            <List dense disablePadding>
              {group.items.map(item => {
              const active = pathname === item.route
              const Icon = item.Icon
              return (
                <ListItemButton
                  key={item.route}
                  component={Link}
                  to={item.route}
                  onClick={onNavigate}
                  selected={active}
                  sx={{
                    position: 'relative',
                    borderRadius: 1.25,
                    mb: 0.25,
                    minHeight: 40,
                    py: 0.75,
                    px: 1.25,
                    color: active ? PALETTE.shellHeading : PALETTE.shellText,
                    bgcolor: active ? PALETTE.shellNavActive : 'transparent',
                    '& .MuiListItemIcon-root': { color: active ? PALETTE.light : PALETTE.shellMuted },
                    '&::before': active
                      ? { content: '""', position: 'absolute', left: -12, top: 8, bottom: 8, width: 3, borderRadius: 4, bgcolor: PALETTE.mid }
                      : {},
                    '&:hover': { bgcolor: active ? PALETTE.shellNavActive : PALETTE.shellNavHover, color: PALETTE.shellHeading },
                    '&.Mui-selected:hover': { bgcolor: PALETTE.shellNavActive },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 36, color: 'inherit' }}>
                    <Icon sx={{ fontSize: 20 }} />
                  </ListItemIcon>
                  <ListItemText
                    primary={navItemLabel(item, locale)}
                    slotProps={{
                      primary: {
                        sx: { fontSize: 14, fontWeight: active ? 600 : 400, lineHeight: 1.3 },
                      },
                    }}
                  />
                </ListItemButton>
              )
            })}
            </List>
          )}
        </Box>
      ))}
      {filtered.length === 0 ? (
        <Typography variant="body2" sx={{ px: 1.5, py: 2, color: PALETTE.shellMuted }}>
          {t.shell.noSearchResults}
        </Typography>
      ) : null}
    </Box>
  )
}

function SidebarBody({ onNavigate }: { onNavigate: () => void }) {
  const navigate = useNavigate()
  const user = useAuthStore(s => s.user)
  const logout = useAuthStore(s => s.logout)
  const [query, setQuery] = useState('')
  const { t } = useOpsLocale()

  const initial = user?.name?.trim().charAt(0).toUpperCase() ?? 'S'

  const handleLogout = () => {
    logout()
    navigate(ROUTES.LOGIN)
  }

  const iconBtnSx = {
    width: 36, height: 36, color: PALETTE.shellMuted,
    '&:hover': { bgcolor: PALETTE.shellNavHover, color: PALETTE.shellHeading },
  } as const

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box sx={{ px: 2.25, pt: 2.25, pb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 2.25 }}>
          <BrandMark />
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontWeight: 800, fontSize: 17, color: PALETTE.shellHeading, lineHeight: 1.1, letterSpacing: '-0.02em' }}>
              Czen Ops
            </Typography>
            <Typography sx={{ fontSize: 12, color: PALETTE.shellMuted, lineHeight: 1.3 }} noWrap>
              {t.shell.brandSubtitle}
            </Typography>
          </Box>
        </Box>
        <TextField
          fullWidth
          size="small"
          placeholder={t.shell.searchPlaceholder}
          value={query}
          onChange={e => setQuery(e.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ fontSize: 18, color: PALETTE.shellMuted }} />
                </InputAdornment>
              ),
              sx: { bgcolor: PALETTE.shellSearch, fontSize: 13.5 },
            },
          }}
        />
      </Box>

      <NavList onNavigate={onNavigate} query={query} />

      <Box sx={{ px: 1.5, py: 1.5, borderTop: `1px solid ${PALETTE.shellBorder}`, display: 'flex', flexDirection: 'column', gap: 1 }}>
        <LocalePicker />
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, p: 1, borderRadius: 1.5, bgcolor: PALETTE.shellElevated, border: `1px solid ${PALETTE.shellBorder}` }}>
          <Avatar sx={{ width: 34, height: 34, fontSize: 14, fontWeight: 700, backgroundImage: PALETTE.brandGradient, color: '#fff' }}>
            {initial}
          </Avatar>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography sx={{ fontWeight: 600, fontSize: 13.5, color: PALETTE.shellHeading, lineHeight: 1.25 }} noWrap>
              {user?.name ?? t.shell.fallbackName}
            </Typography>
            <Typography sx={{ fontSize: 12, color: PALETTE.shellMuted }} noWrap>
              {user?.email ?? t.shell.fallbackRole}
            </Typography>
          </Box>
          <Tooltip title={t.shell.signOut}>
            <IconButton onClick={handleLogout} aria-label={t.shell.signOut} sx={iconBtnSx}>
              <LogoutIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
    </Box>
  )
}

export function BrandMark({ size = 34 }: { size?: number }) {
  return (
    <Box
      sx={{
        width: size, height: size, borderRadius: size / 3.2, flexShrink: 0,
        display: 'grid', placeItems: 'center',
        backgroundImage: PALETTE.brandGradient,
        boxShadow: '0 6px 18px rgba(124, 58, 237, 0.35)',
        color: '#fff', fontWeight: 800, fontSize: size * 0.5, letterSpacing: '-0.04em',
      }}
    >
      C
    </Box>
  )
}

type SettingsSidebarProps = {
  mobileOpen: boolean
  onClose: () => void
}

export function SettingsSidebar({ mobileOpen, onClose }: SettingsSidebarProps) {
  return (
    <>
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onClose}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': drawerPaperSx,
        }}
      >
        <SidebarBody onNavigate={onClose} />
      </Drawer>

      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', md: 'block' },
          width: SETTINGS_SIDEBAR_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': drawerPaperSx,
        }}
      >
        <SidebarBody onNavigate={() => {}} />
      </Drawer>
    </>
  )
}

export function SettingsMobileMenuButton({ onClick }: { onClick: () => void }) {
  const { t } = useOpsLocale()
  return (
    <IconButton
      onClick={onClick}
      aria-label={t.shell.openMenu}
      sx={{
        display: { xs: 'inline-flex', md: 'none' },
        position: 'fixed',
        top: 12,
        left: 12,
        zIndex: 1200,
        width: 44,
        height: 44,
        bgcolor: PALETTE.shellPanel,
        border: `1px solid ${PALETTE.shellBorder}`,
        color: PALETTE.shellText,
        '&:hover': { bgcolor: PALETTE.shellNavHover },
      }}
    >
      <MenuIcon />
    </IconButton>
  )
}
