import type { ReactNode } from 'react'
import { Box, Card, CardContent, Typography } from '@mui/material'
import { authCardSx, authSceneSx } from '../styles/forms'
import { PALETTE } from '../styles/palette'

type AuthLayoutProps = {
  title: string
  subtitle: string
  children: ReactNode
  footer?: ReactNode
  wide?: boolean
}

export default function AuthLayout({ title, subtitle, children, footer, wide }: AuthLayoutProps) {
  return (
    <Box sx={authSceneSx}>
      <Box sx={{ textAlign: 'center', mb: 3, width: '100%', maxWidth: wide ? 480 : 384 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, color: PALETTE.textPrimary }}>
          {title}
        </Typography>
        <Typography variant="body1" sx={{ color: PALETTE.textSecondary, mt: 1 }}>
          {subtitle}
        </Typography>
      </Box>

      <Card sx={{ ...authCardSx, maxWidth: wide ? 480 : 384 }}>
        <CardContent sx={{ p: { xs: 3, sm: 4 }, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          {children}
        </CardContent>
      </Card>

      {footer ? <Box sx={{ mt: 2.5, textAlign: 'center' }}>{footer}</Box> : null}
    </Box>
  )
}
