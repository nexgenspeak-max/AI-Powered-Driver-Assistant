import { useState, type ReactNode } from 'react'
import { Box, Container, type ContainerProps } from '@mui/material'
import AppSidebar, { AppSidebarMobileButton } from './AppSidebar'
import { PALETTE } from '../styles/palette'

type AppShellProps = {
  children: ReactNode
  maxWidth?: ContainerProps['maxWidth']
  disableGutters?: boolean
}

/** Authenticated web shell — admin-style sidebar + content pane (ui-web.mdc). */
export default function AppShell({ children, maxWidth = 'lg', disableGutters = false }: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <Box sx={{ display: 'flex', minHeight: '100dvh', bgcolor: PALETTE.background }}>
      <AppSidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <AppSidebarMobileButton onClick={() => setMobileOpen(true)} />
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
        <Container
          maxWidth={maxWidth}
          disableGutters={disableGutters}
          sx={{ px: { xs: 1, sm: 0 } }}
        >
          {children}
        </Container>
      </Box>
    </Box>
  )
}
