import { Box } from '@mui/material'
import { PALETTE } from '../styles/palette'

export type Tone = 'success' | 'warning' | 'info' | 'error' | 'primary' | 'default'

const TONE: Record<Tone, string> = {
  success: PALETTE.success,
  warning: PALETTE.warning,
  info: PALETTE.info,
  error: PALETTE.danger,
  primary: PALETTE.light,
  default: PALETTE.shellMuted,
}

/** Soft tinted status label with a dot — reads at a glance in dense tables. */
export function StatusPill({ label, tone = 'default' }: { label: string; tone?: Tone }) {
  const c = TONE[tone]
  return (
    <Box
      component="span"
      sx={{
        display: 'inline-flex', alignItems: 'center', gap: 0.75,
        px: 1.1, py: 0.35, borderRadius: 999,
        fontSize: 12, fontWeight: 600, lineHeight: 1.4, whiteSpace: 'nowrap',
        color: c, bgcolor: `${c}1a`, border: `1px solid ${c}33`,
      }}
    >
      <Box component="span" sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: c }} />
      {label}
    </Box>
  )
}

/** Initials avatar tinted from the name, so rows are easy to scan. */
export function InitialsAvatar({ name, size = 32 }: { name: string; size?: number }) {
  const n = (name || '?').trim()
  const parts = n.split(/\s+/)
  const initials = ((parts.length > 1 ? parts[parts.length - 1][0] : '') + (parts[0]?.[0] ?? '?')).toUpperCase().slice(0, 2)
  const hues = [262, 199, 158, 32, 340, 220]
  const hue = hues[[...n].reduce((a, ch) => a + ch.charCodeAt(0), 0) % hues.length]
  return (
    <Box
      sx={{
        width: size, height: size, borderRadius: '50%', flexShrink: 0,
        display: 'grid', placeItems: 'center',
        fontSize: size * 0.38, fontWeight: 700,
        color: `hsl(${hue} 90% 82%)`, bgcolor: `hsl(${hue} 60% 30% / 0.55)`,
        border: `1px solid hsl(${hue} 70% 60% / 0.35)`,
      }}
    >
      {initials}
    </Box>
  )
}
