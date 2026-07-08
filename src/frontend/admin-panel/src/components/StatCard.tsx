import type { ReactNode } from 'react'
import { Box, Typography } from '@mui/material'
import { PALETTE } from '../styles/palette'

export type Stat = {
  label: string
  value: number
  color: string
  icon: ReactNode
}

export function StatCard({ label, value, color, icon }: Stat) {
  return (
    <Box sx={{
      display: 'flex', alignItems: 'center', gap: 1.75,
      p: 2.25, borderRadius: 3, bgcolor: '#fff',
      border: `1px solid ${PALETTE.border}`,
      transition: 'all 0.15s ease',
      '&:hover': { borderColor: color, boxShadow: `0 4px 14px ${color}26`, transform: 'translateY(-1px)' },
    }}>
      <Box sx={{
        width: 44, height: 44, borderRadius: '12px', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        bgcolor: `${color}1a`, color,
      }}>
        {icon}
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="body2" sx={{ color: PALETTE.gray, fontWeight: 500 }}>{label}</Typography>
        <Typography variant="h5" sx={{ fontWeight: 800, color: PALETTE.ink, lineHeight: 1.2, mt: 0.25 }}>{value}</Typography>
      </Box>
    </Box>
  )
}

export function StatCardGrid({ stats }: { stats: Stat[] }) {
  return (
    <Box sx={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
      gap: 2, mb: 3,
    }}>
      {stats.map(s => <StatCard key={s.label} {...s} />)}
    </Box>
  )
}
