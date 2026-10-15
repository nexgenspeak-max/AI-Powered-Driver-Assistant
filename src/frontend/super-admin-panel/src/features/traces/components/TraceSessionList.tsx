import { useState } from 'react'
import {
  Box, Chip, FormControl, InputLabel, List, ListItemButton, MenuItem, Select, Stack, TextField, Typography,
} from '@mui/material'
import { PALETTE } from '../../../styles/palette'
import { useOpsLocale } from '../../../i18n/useOpsLocale'
import type { TraceSessionSummary } from '../types'
import { isLiveSession } from '../useTraceSessions'
import { fmtDateTime, MONO_FONT } from '../format'

const KNOWN_MODES = ['driver', 'outbound', 'customer', 'custcall']

type StatusFilter = '' | 'live' | 'ended'

type Props = {
  sessions: TraceSessionSummary[]
  /** Time the list was fetched (ms); used to tell live sessions from abandoned ones. */
  now: number
  selected: string | null
  onSelect: (room: string) => void
  mode: string
  onModeChange: (mode: string) => void
}

function matches(s: TraceSessionSummary, q: string): boolean {
  const needle = q.trim().toLowerCase()
  return !needle || s.room.toLowerCase().includes(needle) || (s.participant ?? '').toLowerCase().includes(needle)
}

function SessionRow({ s, live, selected, onSelect }: { s: TraceSessionSummary; live: boolean; selected: boolean; onSelect: () => void }) {
  const { t, locale } = useOpsLocale()
  const T = t.traces
  const errors = s.stats.toolErrors + s.stats.opErrors
  return (
    <ListItemButton
      selected={selected}
      onClick={onSelect}
      sx={{ minHeight: 44, borderRadius: 1, mb: 0.5, display: 'block', '&.Mui-selected': { bgcolor: PALETTE.shellNavActive } }}
    >
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        <Chip size="small" label={s.mode ?? '?'} variant="outlined" />
        <Typography variant="body2" sx={{ fontWeight: 600, flex: 1, minWidth: 0 }} noWrap>
          {s.participant ?? s.room}
        </Typography>
        {live && <Chip size="small" color="success" label={T.live} />}
      </Stack>
      <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', fontFamily: MONO_FONT }} noWrap>
        {s.room}
      </Typography>
      <Stack direction="row" spacing={1} useFlexGap sx={{ mt: 0.5, alignItems: 'center', flexWrap: 'wrap' }}>
        <Typography variant="caption" color="text.secondary">{fmtDateTime(s.startedAt, locale)}</Typography>
        <Typography variant="caption" color="text.secondary">· {T.turnsN(s.turns)}</Typography>
        {s.stats.slowTurns > 0 && <Chip size="small" color="warning" variant="outlined" label={T.slowN(s.stats.slowTurns)} />}
        {errors > 0 && <Chip size="small" color="error" variant="outlined" label={T.errorsN(errors)} />}
      </Stack>
    </ListItemButton>
  )
}

export function TraceSessionList({ sessions, now, selected, onSelect, mode, onModeChange }: Props) {
  const { t } = useOpsLocale()
  const T = t.traces
  const [status, setStatus] = useState<StatusFilter>('')
  const [q, setQ] = useState('')
  const modes = [...new Set([...KNOWN_MODES, ...sessions.map(s => s.mode).filter((m): m is string => !!m)])]
  const visible = sessions
    .filter(s => matches(s, q))
    .filter(s => !status || (status === 'live') === isLiveSession(s, now))

  return (
    <Stack spacing={1.5}>
      <TextField size="small" label={T.search} value={q} onChange={e => setQ(e.target.value)} />
      <Stack direction="row" spacing={1}>
        <FormControl size="small" sx={{ flex: 1 }}>
          <InputLabel>{T.mode}</InputLabel>
          <Select label={T.mode} value={mode} onChange={e => onModeChange(e.target.value)}>
            <MenuItem value="">{T.allModes}</MenuItem>
            {modes.map(m => <MenuItem key={m} value={m}>{m}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ flex: 1 }}>
          <InputLabel>{T.status}</InputLabel>
          <Select label={T.status} value={status} onChange={e => setStatus(e.target.value as StatusFilter)}>
            <MenuItem value="">{T.allStatus}</MenuItem>
            <MenuItem value="live">{T.live}</MenuItem>
            <MenuItem value="ended">{T.ended}</MenuItem>
          </Select>
        </FormControl>
      </Stack>
      <Box sx={{ maxHeight: { md: 'calc(100vh - 340px)' }, overflow: 'auto' }}>
        {visible.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ p: 1 }}>{T.empty}</Typography>
        ) : (
          <List disablePadding>
            {visible.map(s => (
              <SessionRow
                key={s.room}
                s={s}
                live={isLiveSession(s, now)}
                selected={s.room === selected}
                onSelect={() => onSelect(s.room)}
              />
            ))}
          </List>
        )}
      </Box>
    </Stack>
  )
}
