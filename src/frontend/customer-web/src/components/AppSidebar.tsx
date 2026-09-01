import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  Avatar,
  Box,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Tooltip,
  Typography,
} from '@mui/material'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import LogoutIcon from '@mui/icons-material/Logout'
import MenuIcon from '@mui/icons-material/Menu'
import ThemeToggle from './ThemeToggle'
import { NAV_ITEMS } from '../features/home/navItems'
import { useLogout } from '../features/auth/hooks/useLogout'
import { useAuthStore } from '../stores/authStore'
import { useUiStore } from '../stores/uiStore'
import { PALETTE } from '../styles/palette'

export const SIDEBAR_WIDTH = 260
export const SIDEBAR_COLLAPSED_WIDTH = 72

function navButtonSx(active: boolean, collapsed: boolean) {
  return {
    borderRadius: 1.5,
    mb: 0.25,
    minHeight: 44,
    minWidth: collapsed ? 44 : undefined,
    justifyContent: collapsed ? 'center' : 'flex-start',
    px: collapsed ? 1 : 1.5,
    color: active ? '#fff' : PALETTE.textSecondary,
    bgcolor: active ? PALETTE.primary : 'transparent',
    '&:hover': { bgcolor: active ? PALETTE.primaryPress : PALETTE.primaryMuted },
    '&.Mui-selected:hover': { bgcolor: PALETTE.primaryPress },
  } as const
}

function SidebarBody({
  collapsed,
  onNavigate,
  onToggleCollapse,
}: {
  collapsed: boolean
  onNavigate: () => void
  onToggleCollapse: () => void
}) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const customer = useAuthStore(s => s.customer)
  const logout = useLogout()
  const displayName = customer?.name ?? 'Khách hàng'
  const initial = displayName.trim().charAt(0).toUpperCase()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box sx={{ px: collapsed ? 1 : 2, pt: 2.5, pb: collapsed ? 1.5 : 2 }}>
        {collapsed ? (
          <Tooltip title="Czen" placement="right" arrow>
            <Box
              component={Link}
              to="/"
              onClick={onNavigate}
              sx={{
                width: 44,
                height: 44,
                mx: 'auto',
                borderRadius: 1.5,
                bgcolor: PALETTE.primaryMuted,
                color: PALETTE.primary,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: 16,
                textDecoration: 'none',
              }}
            >
              C
            </Box>
          </Tooltip>
        ) : (
          <Typography
            component={Link}
            to="/"
            onClick={onNavigate}
            sx={{
              fontWeight: 800,
              fontSize: 20,
              color: PALETTE.textPrimary,
              textDecoration: 'none',
              display: 'block',
              mb: 2,
            }}
          >
            Czen
          </Typography>
        )}
      </Box>

      <Divider sx={{ borderColor: PALETTE.border, mx: collapsed ? 1 : 2 }} />

      <Box sx={{ flex: 1, overflow: 'auto', px: collapsed ? 0.75 : 1.5, py: 1.5 }}>
        <List dense disablePadding>
          {NAV_ITEMS.map(item => {
            const Icon = item.icon
            const active = pathname === item.to
            const button = (
              <ListItemButton
                key={item.to}
                component={Link}
                to={item.to}
                onClick={onNavigate}
                selected={active}
                sx={navButtonSx(active, collapsed)}
              >
                <ListItemIcon sx={{ minWidth: collapsed ? 0 : 36, color: 'inherit', justifyContent: 'center' }}>
                  <Icon sx={{ fontSize: 20 }} />
                </ListItemIcon>
                {!collapsed ? (
                  <ListItemText
                    primary={item.label}
                    slotProps={{ primary: { sx: { fontSize: 14, fontWeight: active ? 600 : 500 } } }}
                  />
                ) : null}
              </ListItemButton>
            )
            return collapsed ? (
              <Tooltip key={item.to} title={item.label} placement="right" arrow>
                {button}
              </Tooltip>
            ) : (
              button
            )
          })}
        </List>
      </Box>

      <Box
        sx={{
          px: collapsed ? 0.75 : 2,
          py: 1.5,
          borderTop: `1px solid ${PALETTE.border}`,
        }}
      >
        {collapsed ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.75 }}>
            <Tooltip title={displayName} placement="right" arrow>
              <Avatar sx={{ width: 36, height: 36, fontSize: 14, fontWeight: 700, bgcolor: PALETTE.primary }}>
                {initial}
              </Avatar>
            </Tooltip>
            <ThemeToggle collapsed />
            <Tooltip title="Đăng xuất" placement="right" arrow>
              <IconButton onClick={handleLogout} aria-label="Đăng xuất" sx={{ width: 44, height: 44 }}>
                <LogoutIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Mở rộng menu" placement="right" arrow>
              <IconButton onClick={onToggleCollapse} aria-label="Mở rộng menu" sx={{ width: 44, height: 44 }}>
                <ChevronRightIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        ) : (
          <>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
              <Avatar sx={{ width: 36, height: 36, fontSize: 14, fontWeight: 700, bgcolor: PALETTE.primary }}>
                {initial}
              </Avatar>
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                  {displayName}
                </Typography>
                <Typography variant="caption" sx={{ color: PALETTE.textMuted, display: 'block' }} noWrap>
                  {customer?.phone}
                </Typography>
              </Box>
              <Tooltip title="Đăng xuất">
                <IconButton onClick={handleLogout} aria-label="Đăng xuất" sx={{ width: 44, height: 44 }}>
                  <LogoutIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <ThemeToggle />
              <Tooltip title="Thu gọn menu">
                <IconButton onClick={onToggleCollapse} aria-label="Thu gọn menu" sx={{ width: 36, height: 36 }}>
                  <ChevronLeftIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </>
        )}
      </Box>
    </Box>
  )
}

function drawerPaperSx(collapsed: boolean) {
  return {
    width: collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH,
    boxSizing: 'border-box' as const,
    bgcolor: PALETTE.surface,
    borderRight: `1px solid ${PALETTE.border}`,
    transition: 'width 0.2s ease',
    overflowX: 'hidden' as const,
  }
}

type AppSidebarProps = {
  mobileOpen: boolean
  onClose: () => void
}

export default function AppSidebar({ mobileOpen, onClose }: AppSidebarProps) {
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
          width: collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH,
          flexShrink: 0,
          transition: 'width 0.2s ease',
          '& .MuiDrawer-paper': drawerPaperSx(collapsed),
        }}
      >
        <SidebarBody collapsed={collapsed} onNavigate={() => {}} onToggleCollapse={toggleSidebarCollapsed} />
      </Drawer>
    </>
  )
}

export function AppSidebarMobileButton({ onClick }: { onClick: () => void }) {
  return (
    <IconButton
      onClick={onClick}
      aria-label="Mở menu điều hướng"
      sx={{
        display: { xs: 'inline-flex', md: 'none' },
        position: 'fixed',
        top: 12,
        left: 12,
        zIndex: 1200,
        width: 44,
        height: 44,
        bgcolor: PALETTE.surface,
        border: `1px solid ${PALETTE.border}`,
        boxShadow: 1,
        '&:hover': { bgcolor: PALETTE.surfaceVariant },
      }}
    >
      <MenuIcon />
    </IconButton>
  )
}
