import type { ReactNode } from 'react'
import { Card, type CardProps } from '@mui/material'
import { PALETTE } from '../styles/palette'

type SurfaceCardProps = CardProps & {
  children: ReactNode
}

export default function SurfaceCard({ children, sx, ...rest }: SurfaceCardProps) {
  return (
    <Card
      elevation={0}
      sx={{
        borderRadius: 3,
        border: `1px solid ${PALETTE.outline}`,
        bgcolor: PALETTE.surfaceElevated,
        boxShadow: '0 4px 16px rgba(17,24,39,0.06)',
        ...sx,
      }}
      {...rest}
    >
      {children}
    </Card>
  )
}
