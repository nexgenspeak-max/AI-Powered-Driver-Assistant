import { useState, type ReactNode } from 'react'
import { Box } from '@mui/material'
import { PALETTE } from '../styles/palette'
import { SettingsMobileMenuButton, SettingsSidebar } from './SettingsSidebar'
import { SettingsPageFrame } from './SettingsPageFrame'

export function SettingsShellLayout({ children }: { children: ReactNode }) {
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
          px: { xs: 3, sm: 4 },
          py: { xs: 8, md: 4 },
        }}
      >
        <SettingsPageFrame>{children}</SettingsPageFrame>
      </Box>
    </Box>
  )
}
