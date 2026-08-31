import { useState } from 'react'
import { Box } from '@mui/material'
import { PALETTE } from '../styles/palette'
import { SettingsMobileMenuButton, SettingsSidebar } from './SettingsSidebar'
import { SettingsPageFrame } from './SettingsPageFrame'

/** Cursor Settings-style shell — sidebar search + grouped nav + content pane. */
export function SettingsShellLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <Box
      sx={{
        display: 'flex',
        minHeight: '100dvh',
        bgcolor: PALETTE.shellContent,
        color: PALETTE.shellText,
      }}
    >
      <SettingsSidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <SettingsMobileMenuButton onClick={() => setMobileOpen(true)} />
      <Box
        component="main"
        sx={{
          flex: 1,
          minWidth: 0,
          overflow: 'auto',
          px: { xs: 2, sm: 3, md: 4 },
          py: { xs: 7, md: 3 },
        }}
      >
        <SettingsPageFrame>{children}</SettingsPageFrame>
      </Box>
    </Box>
  )
}

/** @deprecated use SettingsShellLayout */
export const DashboardLayout = SettingsShellLayout
