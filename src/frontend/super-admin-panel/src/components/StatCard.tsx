import type { ReactNode } from 'react'
import { Box, Typography } from '@mui/material'
import { PALETTE } from '../styles/palette'

export type Stat = {
  label: string
  value: string | number
  color: string
  icon: ReactNode
}

export function StatCard({ label, value, color, icon }: Stat) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        p: 2,
        borderRadius: 2,
        bgcolor: PALETTE.shellStat,
        border: `1px solid ${PALETTE.shellBorder}`,
      }}
    >
      <Box
        sx={{
          width: 40,
          height: 40,
          borderRadius: 1.5,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: `${color}22`,
          color,
        }}
      >
        {icon}
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500, display: 'block' }}>
          {label}
        </Typography>
        <Typography variant="h5" sx={{ fontWeight: 700, color: 'text.primary', lineHeight: 1.2, mt: 0.25 }}>
          {value}
        </Typography>
      </Box>
    </Box>
  )
}

export function StatCardGrid({ stats }: { stats: Stat[] }) {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(auto-fit, minmax(160px, 1fr))' },
        gap: 2,
        mb: 3,
      }}
    >
      {stats.map(s => (
        <StatCard key={s.label} {...s} />
      ))}
    </Box>
  )
}
