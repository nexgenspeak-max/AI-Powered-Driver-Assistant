import { useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  Avatar,
  Box,
  Divider,
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
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import LogoutIcon from '@mui/icons-material/Logout'
import SearchIcon from '@mui/icons-material/Search'
import MenuIcon from '@mui/icons-material/Menu'
import { ROUTES } from '../constants/routes'
import { PALETTE } from '../styles/palette'
import { useAuthStore } from '../stores/authStore'
import { useUiStore } from '../stores/uiStore'
import { AdminLocalePicker } from '../components/AdminLocalePicker'
import { filterAdminNavItems, groupLabel, navItemLabel } from '../i18n/navText'
import { useAdminLocale } from '../i18n/useAdminLocale'
import { ADMIN_NAV_GROUPS, ADMIN_NAV_ITEMS, type AdminNavItem } from './navRegistry'

export const SETTINGS_SIDEBAR_WIDTH = 260
export const SETTINGS_SIDEBAR_COLLAPSED_WIDTH = 52

function navButtonSx(active: boolean, collapsed: boolean) {
  return {
    borderRadius: 1.5,
    mb: 0.25,
    minHeight: 44,
    minWidth: collapsed ? 44 : undefined,
    justifyContent: collapsed ? 'center' : 'flex-start',
    px: collapsed ? 1 : 1.5,
    py: 1,
    color: active ? '#fff' : PALETTE.shellText,
    bgcolor: active ? PALETTE.shellNavActive : 'transparent',
    '&:hover': { bgcolor: active ? PALETTE.shellNavActive : PALETTE.shellNavHover },
    '&.Mui-selected:hover': { bgcolor: PALETTE.shellNavActive },
  } as const
}

function NavItem({
  item,
  active,
  collapsed,
  label,
  tooltip,
  onNavigate,
}: {
  item: AdminNavItem
  active: boolean
  collapsed: boolean
  label: string
  tooltip: string
  onNavigate: () => void
}) {
  const Icon = item.Icon
  const button = (
    <ListItemButton
      component={Link}
      to={item.route}
      onClick={onNavigate}
      selected={active}
      sx={navButtonSx(active, collapsed)}
    >
      <ListItemIcon sx={{ minWidth: collapsed ? 0 : 36, color: 'inherit', justifyContent: 'center' }}>
        <Icon sx={{ fontSize: 20 }} />
      </ListItemIcon>
      {!collapsed ? (
        <ListItemText
          primary={label}
          slotProps={{
            primary: {
              sx: { fontSize: 14, fontWeight: active ? 600 : 400, lineHeight: 1.3 },
            },
          }}
        />
      ) : null}
    </ListItemButton>
  )

  if (collapsed) {
    return (
      <Tooltip title={tooltip} placement="right" arrow>
        {button}
      </Tooltip>
    )
  }
  return button
}

function NavList({
  collapsed,
  onNavigate,
  query,
  onExpand,
}: {
  collapsed: boolean
  onNavigate: () => void
  query: string
  onExpand: () => void
}) {
  const { pathname } = useLocation()
  const { locale, t } = useAdminLocale()
  const filtered = useMemo(() => filterAdminNavItems(query, locale), [query, locale])

  if (collapsed) {
    return (
      <Box sx={{ flex: 1, overflow: 'auto', px: 0.75, py: 1 }}>
        <List dense disablePadding>
          {ADMIN_NAV_ITEMS.map(item => {
            const active = pathname === item.route
            const label = navItemLabel(item, locale)
            const group = groupLabel(item.group, locale)
            return (
              <NavItem
                key={item.route}
                item={item}
                active={active}
                collapsed
                label={label}
                tooltip={`${group} · ${label}`}
                onNavigate={onNavigate}
              />
            )
          })}
        </List>
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1 }}>
          <Tooltip title={t.shell.search} placement="right" arrow>
            <IconButton
              onClick={onExpand}
              aria-label={t.shell.search}
              sx={{
                width: 44,
                height: 44,
                color: PALETTE.shellMuted,
                '&:hover': { bgcolor: PALETTE.shellNavHover, color: '#fff' },
              }}
            >
              <SearchIcon sx={{ fontSize: 20 }} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
    )
  }

  const byGroup = ADMIN_NAV_GROUPS.map(g => ({
    ...g,
    label: groupLabel(g.id, locale),
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
              py: 0.75,
              display: 'block',
              color: PALETTE.shellMuted,
              fontWeight: 600,
              letterSpacing: 0.4,
              textTransform: 'uppercase',
              fontSize: 11,
            }}
          >
            {group.label}
          </Typography>
          <List dense disablePadding>
            {group.items.map(item => {
              const active = pathname === item.route
              const label = navItemLabel(item, locale)
              return (
                <NavItem
                  key={item.route}
                  item={item}
                  active={active}
                  collapsed={false}
                  label={label}
                  tooltip={label}
                  onNavigate={onNavigate}
                />
              )
            })}
          </List>
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

function SidebarBody({ collapsed, onNavigate, onToggleCollapse }: {
  collapsed: boolean
  onNavigate: () => void
  onToggleCollapse: () => void
}) {
  const navigate = useNavigate()
  const admin = useAuthStore(s => s.admin)
  const logout = useAuthStore(s => s.logout)
  const setSidebarCollapsed = useUiStore(s => s.setSidebarCollapsed)
  const [query, setQuery] = useState('')
  const { t } = useAdminLocale()

  const initial = admin?.name?.trim().charAt(0).toUpperCase() ?? 'A'
  const displayName = admin?.name ?? t.shell.fallbackAdmin

  const handleLogout = () => {
    logout()
    navigate(ROUTES.LOGIN)
  }

  const expand = () => setSidebarCollapsed(false)

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box sx={{ px: collapsed ? 1 : 2, pt: 2, pb: collapsed ? 1.5 : 2 }}>
        {collapsed ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1 }}>
            <Tooltip title={displayName} placement="right" arrow>
              <Avatar sx={{ width: 32, height: 32, fontSize: 13, fontWeight: 700, bgcolor: PALETTE.base }}>
                {initial}
              </Avatar>
            </Tooltip>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
            <Avatar sx={{ width: 36, height: 36, fontSize: 14, fontWeight: 700, bgcolor: PALETTE.base }}>
              {initial}
            </Avatar>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 600, color: '#fff', lineHeight: 1.25 }} noWrap>
                {displayName}
              </Typography>
              <Typography variant="caption" sx={{ color: PALETTE.shellMuted, display: 'block' }} noWrap>
                {admin?.email ?? t.shell.fallbackRole}
              </Typography>
            </Box>
            <Tooltip title={t.shell.signOut}>
              <IconButton
                onClick={handleLogout}
                aria-label={t.shell.signOut}
                sx={{
                  width: 44,
                  height: 44,
                  color: PALETTE.shellMuted,
                  '&:hover': { bgcolor: PALETTE.shellNavHover, color: '#fff' },
                }}
              >
                <LogoutIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        )}

        {!collapsed ? (
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
                sx: {
                  bgcolor: PALETTE.shellSearch,
                  borderRadius: 1.5,
                  color: '#fff',
                  fontSize: 14,
                  '& fieldset': { border: 'none' },
                },
              },
            }}
          />
        ) : null}
      </Box>

      {!collapsed ? <Divider sx={{ borderColor: PALETTE.shellBorder, mx: 2 }} /> : null}

      <NavList
        collapsed={collapsed}
        onNavigate={onNavigate}
        query={query}
        onExpand={expand}
      />

      <Box
        sx={{
          px: collapsed ? 0.75 : 2,
          py: 1.5,
          borderTop: `1px solid ${PALETTE.shellBorder}`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: collapsed ? 'center' : 'stretch',
          gap: collapsed ? 0.75 : 0,
        }}
      >
        <AdminLocalePicker variant={collapsed ? 'collapsed' : 'sidebar'} />

        {collapsed ? (
          <>
            <Tooltip title={t.shell.signOut} placement="right" arrow>
              <IconButton
                onClick={handleLogout}
                aria-label={t.shell.signOut}
                sx={{
                  width: 40,
                  height: 40,
                  color: PALETTE.shellMuted,
                  '&:hover': { bgcolor: PALETTE.shellNavHover, color: '#fff' },
                }}
              >
                <LogoutIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title={t.shell.expandSidebar} placement="right" arrow>
              <IconButton
                onClick={onToggleCollapse}
                aria-label={t.shell.expandSidebar}
                sx={{
                  width: 40,
                  height: 40,
                  color: PALETTE.shellMuted,
                  '&:hover': { bgcolor: PALETTE.shellNavHover, color: '#fff' },
                }}
              >
                <ChevronRightIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </>
        ) : (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 1, gap: 1 }}>
            <Typography variant="caption" sx={{ color: PALETTE.shellMuted }}>
              {t.shell.sectionsFooter(ADMIN_NAV_ITEMS.length)}
            </Typography>
            <Tooltip title={t.shell.collapseSidebar} placement="top" arrow>
              <IconButton
                onClick={onToggleCollapse}
                aria-label={t.shell.collapseSidebar}
                sx={{
                  width: 36,
                  height: 36,
                  color: PALETTE.shellMuted,
                  '&:hover': { bgcolor: PALETTE.shellNavHover, color: '#fff' },
                }}
              >
                <ChevronLeftIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        )}
      </Box>
    </Box>
  )
}

function drawerPaperSx(collapsed: boolean) {
  return {
    width: collapsed ? SETTINGS_SIDEBAR_COLLAPSED_WIDTH : SETTINGS_SIDEBAR_WIDTH,
    boxSizing: 'border-box' as const,
    bgcolor: PALETTE.shellSidebar,
    color: PALETTE.shellText,
    borderRight: `1px solid ${PALETTE.shellBorder}`,
    transition: 'width 0.2s ease',
    overflowX: 'hidden' as const,
  }
}

type SettingsSidebarProps = {
  mobileOpen: boolean
  onClose: () => void
}

export function SettingsSidebar({ mobileOpen, onClose }: SettingsSidebarProps) {
  const collapsed = useUiStore(s => s.sidebarCollapsed)
  const toggleSidebarCollapsed = useUiStore(s => s.toggleSidebarCollapsed)

  return (
    <>
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onClose}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': drawerPaperSx(false),
        }}
      >
        <SidebarBody collapsed={false} onNavigate={onClose} onToggleCollapse={onClose} />
      </Drawer>

      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', md: 'block' },
          width: collapsed ? SETTINGS_SIDEBAR_COLLAPSED_WIDTH : SETTINGS_SIDEBAR_WIDTH,
          flexShrink: 0,
          transition: 'width 0.2s ease',
          '& .MuiDrawer-paper': drawerPaperSx(collapsed),
        }}
      >
        <SidebarBody
          collapsed={collapsed}
          onNavigate={() => {}}
          onToggleCollapse={toggleSidebarCollapsed}
        />
      </Drawer>
    </>
  )
}

export function SettingsMobileMenuButton({ onClick }: { onClick: () => void }) {
  const { t } = useAdminLocale()

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
