import { useState } from 'react'
import { Box, Button, Chip, Paper, Stack, Typography } from '@mui/material'
import DataObjectIcon from '@mui/icons-material/DataObject'
import { PALETTE } from '../../../styles/palette'
import { useOpsLocale } from '../../../i18n/useOpsLocale'
import type { Turn } from '../groupTurns'
import { SLOW_TURN_MS } from '../metrics'
import { fmtClock, fmtOffset } from '../format'
import { JsonBlock } from './JsonBlock'
import { LatencyBar } from './LatencyBar'
import { LlmCallView } from './LlmCallView'
import { CompactOps, SpokenLines, ToolResults, TurnErrors } from './TurnSections'

type Props = { turn: Turn; startTs?: number }

export function TurnCard({ turn, startTs }: Props) {
  const { t, locale } = useOpsLocale()
  const T = t.traces
  const [raw, setRaw] = useState(false)
  const m = turn.metrics
  const slow = !!m && (m.slow === true || (m.total_ms ?? 0) >= SLOW_TURN_MS)
  const failures =
    turn.errors.length +
    turn.tools.filter(x => x.is_error).length +
    turn.ops.filter(o => o.ok === false).length +
    turn.llmCalls.filter(c => c.response?.error).length

  return (
    <Paper
      variant="outlined"
      sx={{ p: 2, bgcolor: PALETTE.shellPanel, borderColor: slow ? PALETTE.danger : PALETTE.shellBorder }}
    >
      <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap', mb: 1 }}>
        <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 700 }}>
          {turn.index === 0 ? T.greeting : T.turn(turn.index)}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {fmtClock(turn.ts * 1000, locale)} {fmtOffset(turn.ts, startTs)}
        </Typography>
        {slow && <Chip size="small" color="error" label={T.latency.slow} />}
        {failures > 0 && <Chip size="small" color="error" variant="outlined" label={T.errorsN(failures)} />}
        <Box sx={{ flex: 1 }} />
        <Button
          size="small"
          startIcon={<DataObjectIcon fontSize="small" />}
          onClick={() => setRaw(r => !r)}
          aria-pressed={raw}
          sx={{ minHeight: 44 }}
        >
          {T.rawJson}
        </Button>
      </Stack>

      <Stack spacing={1.5}>
        {turn.index > 0 && (
          <Box sx={{ borderLeft: `3px solid ${PALETTE.info}`, pl: 1.5 }}>
            <Typography variant="caption" sx={{ color: PALETTE.info, fontWeight: 700 }}>
              {T.roles.user}{turn.user?.language ? ` · ${turn.user.language}` : ''}
            </Typography>
            <Typography variant="body1" sx={{ color: turn.user?.text ? 'text.primary' : 'text.secondary' }}>
              {turn.user?.text || T.noUtterance}
            </Typography>
          </Box>
        )}
        {m && <LatencyBar metrics={m} />}
        {turn.llmCalls.map((call, i) => <LlmCallView key={call.key} call={call} number={i + 1} />)}
        <ToolResults tools={turn.tools} />
        <SpokenLines speech={turn.speech} />
        <CompactOps ops={turn.ops} />
        <TurnErrors errors={turn.errors} />
        {raw && <JsonBlock value={turn.events} maxHeight={480} />}
      </Stack>
    </Paper>
  )
}
