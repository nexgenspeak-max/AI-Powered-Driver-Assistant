import { Alert, Box, Chip, Stack, Typography } from '@mui/material'
import { PALETTE } from '../../../styles/palette'
import { useOpsLocale } from '../../../i18n/useOpsLocale'
import type { ErrorEvent, OpEvent, SpeechEvent, ToolEvent } from '../types'
import { fmtMs, MONO_FONT, opSummary } from '../format'
import { JsonBlock } from './JsonBlock'

export function SectionLabel({ children }: { children: string }) {
  return (
    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
      {children}
    </Typography>
  )
}

export function ToolResults({ tools }: { tools: ToolEvent[] }) {
  const { t } = useOpsLocale()
  const T = t.traces
  if (!tools.length) return null
  return (
    <Stack spacing={1}>
      <SectionLabel>{T.toolResults}</SectionLabel>
      {tools.map(tool => (
        <Box
          key={tool.seq}
          sx={{ borderLeft: `3px solid ${tool.is_error ? PALETTE.danger : PALETTE.success}`, pl: 1.5 }}
        >
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }} useFlexGap>
            <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: MONO_FONT }}>{tool.name ?? '?'}</Typography>
            <Chip
              size="small"
              label={tool.is_error ? T.error : 'OK'}
              color={tool.is_error ? 'error' : 'success'}
              variant="outlined"
            />
            <Typography variant="caption" color="text.secondary">{fmtMs(tool.duration_ms)}</Typography>
          </Stack>
          <Typography variant="caption" color="text.secondary">{T.args}</Typography>
          <JsonBlock value={tool.arguments} maxHeight={200} />
          <Typography variant="caption" color="text.secondary">{T.output}</Typography>
          <JsonBlock value={tool.output} maxHeight={280} color={tool.is_error ? PALETTE.danger : undefined} />
        </Box>
      ))}
    </Stack>
  )
}

export function SpokenLines({ speech }: { speech: SpeechEvent[] }) {
  const { t } = useOpsLocale()
  const T = t.traces
  const lines = speech.filter(s => s.role !== 'user')
  if (!lines.length) return null
  return (
    <Stack spacing={0.5}>
      <SectionLabel>{T.spoken}</SectionLabel>
      {lines.map(s => (
        <Stack key={s.seq} direction="row" spacing={1} sx={{ alignItems: 'baseline' }}>
          <Chip size="small" label={s.source ?? '—'} variant="outlined" sx={{ flexShrink: 0 }} />
          <Typography variant="body2" sx={{ textDecoration: s.interrupted ? 'line-through' : 'none' }}>
            {s.text || '—'}
          </Typography>
          {s.interrupted && (
            <Typography variant="caption" sx={{ color: PALETTE.warning, flexShrink: 0 }}>{T.interrupted}</Typography>
          )}
        </Stack>
      ))}
    </Stack>
  )
}

export function CompactOps({ ops }: { ops: OpEvent[] }) {
  const { t } = useOpsLocale()
  if (!ops.length) return null
  return (
    <Stack spacing={0.25}>
      <SectionLabel>{t.traces.ops}</SectionLabel>
      {ops.map(op => {
        const duration = op.fields?.duration_ms
        return (
          <Typography
            key={op.seq}
            variant="caption"
            sx={{ fontFamily: MONO_FONT, color: op.ok === false ? PALETTE.danger : 'text.secondary' }}
          >
            {op.ok === false ? '✗' : '✓'} {op.name} {opSummary(op)}
            {typeof duration === 'number' ? ` ${fmtMs(duration)}` : ''}
          </Typography>
        )
      })}
    </Stack>
  )
}

export function TurnErrors({ errors }: { errors: ErrorEvent[] }) {
  if (!errors.length) return null
  return (
    <Stack spacing={0.5}>
      {errors.map(e => (
        <Alert key={e.seq} severity="error">
          {e.where ? `${e.where}: ` : ''}{e.message}
        </Alert>
      ))}
    </Stack>
  )
}
