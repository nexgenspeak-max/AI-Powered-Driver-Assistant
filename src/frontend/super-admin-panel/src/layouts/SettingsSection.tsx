import type { ReactNode } from 'react'
import { Box, Typography } from '@mui/material'
import { SettingsPanel } from './SettingsPanel'

export function SettingsSection({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <Box sx={{ mt: 3, '&:first-of-type': { mt: 0 } }}>
      <Typography
        variant="caption"
        sx={{
          display: 'block',
          fontWeight: 600,
          letterSpacing: 0.4,
          color: 'text.secondary',
          mb: 1,
        }}
      >
        {title}
      </Typography>
      <SettingsPanel>{children}</SettingsPanel>
    </Box>
  )
}
