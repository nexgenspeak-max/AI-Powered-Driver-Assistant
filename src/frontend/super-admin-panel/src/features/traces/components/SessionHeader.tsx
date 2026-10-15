import { Box, Chip, Stack, Typography } from '@mui/material'
import { PALETTE } from '../../../styles/palette'
import { useOpsLocale } from '../../../i18n/useOpsLocale'
import type { GroupedSession } from '../groupTurns'
import { SLOW_TURN_MS, type SessionMetrics } from '../metrics'
import { LLM_TTFT_SLOW_MS, PROMPT_TOKENS_HIGH } from '../insights'
import type { TraceStreamStatus } from '../useTraceStream'
import { fmtDateTime, fmtDuration, fmtMs, MONO_FONT } from '../format'

type Props = {
  room: string
  session: GroupedSession
  metrics: SessionMetrics
  status: TraceStreamStatus
}

function Tile({ label, value, alert = false }: { label: string; value: string | number; alert?: boolean }) {
  return (
    <Box sx={{ p: 1.5, borderRadius: 1, bgcolor: PALETTE.shellStat, border: `1px solid ${PALETTE.shellBorder}` }}>
      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>{label}</Typography>
      <Typography variant="subtitle1" sx={{ fontWeight: 700, color: alert ? PALETTE.danger : 'text.primary' }}>{value}</Typography>
    </Box>
  )
}

function Meta({ label, value }: { label: string; value?: string }) {
  if (!value) return null
  return <Chip size="small" variant="outlined" label={`${label}: ${value}`} />
}

export function SessionHeader({ room, session, metrics: m, status }: Props) {
  const { t, locale } = useOpsLocale()
  const T = t.traces
  const S = T.stats
  const start = session.start
  const statusLabel =
    status === 'live' ? T.live
      : status === 'ended' ? T.ended
        : status === 'missing' ? T.notFound
          : status === 'disconnected' ? T.disconnected
            : T.connecting
  const statusColor = status === 'live' ? 'success' : status === 'disconnected' || status === 'missing' ? 'warning' : 'default'
  const failedOps = m.opErrors + m.agentErrors

  return (
    <Stack spacing={2}>
      <Box>
        <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
          <Typography variant="h6" component="h2" sx={{ fontFamily: MONO_FONT, fontWeight: 700, wordBreak: 'break-all' }}>
            {room}
          </Typography>
          <Chip size="small" color={statusColor} label={statusLabel} />
        </Stack>
        <Stack direction="row" spacing={1} useFlexGap sx={{ mt: 1, flexWrap: 'wrap' }}>
          <Meta label={T.mode} value={start?.mode} />
          <Meta label={T.lang} value={start?.lang} />
          <Meta label="agent" value={start?.agent} />
          <Meta label="participant" value={start?.participant} />
          <Meta label={T.model} value={start?.model} />
          <Meta label={T.stt} value={start?.stt} />
          <Meta label={T.tts} value={start?.tts} />
          <Meta label={T.duration} value={fmtDuration(m.durationMs)} />
          <Meta label={T.endReason} value={session.end?.reason} />
        </Stack>
        {start && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
            {fmtDateTime(start.ts * 1000, locale)}
          </Typography>
        )}
      </Box>
      <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))' }}>
        <Tile label={S.turns} value={m.userTurns} />
        <Tile label={S.llmCalls} value={m.llmCalls} />
        <Tile label={S.ttftAvg} value={fmtMs(m.ttftAvgMs)} />
        <Tile label={S.ttftP95} value={fmtMs(m.ttftP95Ms)} alert={(m.ttftP95Ms ?? 0) > LLM_TTFT_SLOW_MS} />
        <Tile label={S.totalP95} value={fmtMs(m.totalP95Ms)} alert={(m.totalP95Ms ?? 0) >= SLOW_TURN_MS} />
        <Tile label={S.slowTurns} value={`${m.slowTurns}/${m.measuredTurns}`} alert={m.slowTurns > 0} />
        <Tile label={S.maxPrompt} value={m.maxPromptTokens ?? '—'} alert={(m.maxPromptTokens ?? 0) > PROMPT_TOKENS_HIGH} />
        <Tile label={S.tokens} value={`${m.promptTokens} / ${m.completionTokens}`} />
        <Tile label={S.toolErrors} value={`${m.toolErrors}/${m.toolCalls}`} alert={m.toolErrors > 0} />
        <Tile label={S.opErrors} value={failedOps} alert={failedOps > 0} />
      </Box>
    </Stack>
  )
}
