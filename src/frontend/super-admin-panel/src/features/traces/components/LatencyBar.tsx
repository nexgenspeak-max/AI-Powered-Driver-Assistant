import { Box, Stack, Typography } from '@mui/material'
import { PALETTE } from '../../../styles/palette'
import { useOpsLocale } from '../../../i18n/useOpsLocale'
import type { TurnMetricsEvent } from '../types'
import { SLOW_TURN_MS } from '../metrics'
import { fmtMs } from '../format'

type Segment = { label: string; ms: number; color: string }

function positive(value: number | null | undefined): number {
  return typeof value === 'number' && value > 0 ? value : 0
}

/** Stacked bar: end-of-speech wait → LLM first token → TTS first byte, against the total. */
export function LatencyBar({ metrics }: { metrics: TurnMetricsEvent }) {
  const { t } = useOpsLocale()
  const L = t.traces.latency
  const total = positive(metrics.total_ms)
  const slow = metrics.slow === true || total >= SLOW_TURN_MS
  const segments: Segment[] = [
    { label: L.eou, ms: positive(metrics.eou_ms), color: PALETTE.info },
    { label: L.llm, ms: positive(metrics.llm_ttft_ms), color: PALETTE.light },
    { label: L.tts, ms: positive(metrics.tts_ttfb_ms), color: PALETTE.success },
  ]
  const scale = Math.max(total, segments.reduce((n, s) => n + s.ms, 0), 1)

  return (
    <Box>
      <Box
        role="img"
        aria-label={segments.map(s => `${s.label} ${fmtMs(s.ms)}`).join(', ') + `, ${L.total} ${fmtMs(total)}`}
        sx={{
          display: 'flex',
          height: 12,
          borderRadius: 1,
          overflow: 'hidden',
          bgcolor: PALETTE.shellElevated,
          outline: slow ? `2px solid ${PALETTE.danger}` : 'none',
          outlineOffset: 1,
        }}
      >
        {segments.map(s => (
          <Box key={s.label} sx={{ width: `${(s.ms / scale) * 100}%`, bgcolor: s.color }} />
        ))}
      </Box>
      <Stack direction="row" spacing={2} useFlexGap sx={{ mt: 0.5, flexWrap: 'wrap' }}>
        {segments.map(s => (
          <Typography key={s.label} variant="caption" sx={{ color: 'text.secondary' }}>
            <Box component="span" sx={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', bgcolor: s.color, mr: 0.5 }} />
            {s.label} {fmtMs(s.ms)}
          </Typography>
        ))}
        <Typography variant="caption" sx={{ fontWeight: 700, color: slow ? PALETTE.danger : 'text.primary' }}>
          {L.total} {fmtMs(total)}{slow ? ` · ${L.slow}` : ''}
        </Typography>
      </Stack>
    </Box>
  )
}
