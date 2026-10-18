import type { ReactNode } from 'react'
import { Box, Typography } from '@mui/material'
import { PALETTE } from '../styles/palette'

export function SettingsRow({
  label,
  hint,
  value,
}: {
  label: string
  hint?: string
  value: ReactNode
}) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 2,
        minHeight: 52,
        px: 2.5,
        py: 1.5,
        borderBottom: `1px solid ${PALETTE.shellBorder}`,
        '&:last-child': { borderBottom: 'none' },
      }}
    >
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
          {label}
        </Typography>
        {hint ? (
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.25 }}>
            {hint}
          </Typography>
        ) : null}
      </Box>
      <Box sx={{ maxWidth: '60%', minWidth: 0, overflowWrap: 'anywhere', textAlign: 'right', color: 'text.primary', fontSize: 14 }}>
        {value}
      </Box>
    </Box>
  )
}
