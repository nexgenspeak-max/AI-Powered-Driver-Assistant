import type { ReactNode } from 'react'
import { Box, Card, CardActionArea, CardContent, Typography } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import { PALETTE } from '../styles/palette'

type QuickActionCardProps = {
  to: string
  title: string
  description: string
  icon: ReactNode
}

export default function QuickActionCard({ to, title, description, icon }: QuickActionCardProps) {
  return (
    <Card elevation={0} sx={{ border: `1px solid ${PALETTE.outline}`, borderRadius: 3, height: '100%' }}>
      <CardActionArea component={RouterLink} to={to} sx={{ height: '100%', p: 0.5 }}>
        <CardContent sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 2,
              bgcolor: PALETTE.chipBg,
              color: PALETTE.primary,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {icon}
          </Box>
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: PALETTE.textPrimary }}>
              {title}
            </Typography>
            <Typography variant="body2" sx={{ color: PALETTE.textSecondary, mt: 0.5 }}>
              {description}
            </Typography>
          </Box>
        </CardContent>
      </CardActionArea>
    </Card>
  )
}
