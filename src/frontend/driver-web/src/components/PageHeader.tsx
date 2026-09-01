import type { ReactNode } from 'react'
import { Box, Typography } from '@mui/material'
import { PALETTE } from '../styles/palette'

type PageHeaderProps = {
  title: string
  subtitle?: string
  action?: ReactNode
}

export default function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: { xs: 'flex-start', sm: 'center' },
        justifyContent: 'space-between',
        flexDirection: { xs: 'column', sm: 'row' },
        gap: 2,
        mb: 3,
      }}
    >
      <Box>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 800, color: PALETTE.textPrimary, letterSpacing: '-0.02em' }}>
          {title}
        </Typography>
        {subtitle ? (
          <Typography variant="body1" sx={{ color: PALETTE.textSecondary, mt: 0.75, maxWidth: '65ch' }}>
            {subtitle}
          </Typography>
        ) : null}
      </Box>
      {action}
    </Box>
  )
}
