import type { ReactNode } from 'react'
import { Box, Typography } from '@mui/material'
import { PALETTE } from '../styles/palette'

export type Stat = {
  label: string
  value: string | number
  color: string
  icon: ReactNode
}

/** KPI tile: label and tinted icon tile on top, big number below at full card width. */
export function StatCard({ label, value, color, icon }: Stat) {
  return (
    <Box
      sx={{
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        p: 2.25,
        borderRadius: 2,
        bgcolor: PALETTE.shellStat,
        border: `1px solid ${PALETTE.shellBorder}`,
        transition: 'border-color 0.15s ease, transform 0.15s ease',
        '&::after': {
          content: '""', position: 'absolute', left: 0, right: 0, top: 0, height: 2,
          background: `linear-gradient(90deg, ${color}, transparent 70%)`, opacity: 0.8,
        },
        '&:hover': { borderColor: `${color}55` },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1.5 }}>
        <Typography
          sx={{
            minWidth: 0,
            fontSize: 12, fontWeight: 600, color: 'text.secondary', letterSpacing: '0.03em', textTransform: 'uppercase', lineHeight: 1.35,
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', minHeight: '2.7em',
          }}
          title={label}
        >
          {label}
        </Typography>
        <Box
          sx={{
            width: 40, height: 40, borderRadius: 1.5, flexShrink: 0,
            display: 'grid', placeItems: 'center',
            bgcolor: `${color}1f`, color, border: `1px solid ${color}33`,
          }}
        >
          {icon}
        </Box>
      </Box>
      <Typography sx={{ fontSize: String(value).length > 6 ? 20 : 30, fontWeight: 700, color: 'text.primary', lineHeight: 1.15, mt: 0.5, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
        title={String(value)}>
        {value}
      </Typography>
    </Box>
  )
}

/** `minWidth` is the smallest tile width before the row wraps (larger = fewer, wider tiles). */
export function StatCardGrid({ stats, minWidth = 160 }: { stats: Stat[]; minWidth?: number }) {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: `repeat(auto-fit, minmax(${minWidth}px, 1fr))` },
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
