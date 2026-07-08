import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Box } from '@mui/material'
import { PAGE_TITLES } from '../constants'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation()
  const title = PAGE_TITLES[pathname] ?? 'Admin'
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <Topbar title={title} onMenuClick={() => setMobileOpen(true)} />
        <Box component="main" sx={{ flex: 1, p: 3, overflow: 'auto' }}>{children}</Box>
      </Box>
    </Box>
  )
}
