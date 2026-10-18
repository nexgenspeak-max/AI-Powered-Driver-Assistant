import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Box, Chip, FormControl, InputLabel, MenuItem, Select, Stack, TextField, Typography,
} from '@mui/material'
import { LOG_SERVICE_IDS } from '../types/ops'
import { useOpsLocale } from '../i18n/useOpsLocale'
import { PALETTE } from '../styles/palette'
import { useLogStream } from '../features/logs/useLogStream'

const LEVEL_COLOR: Record<string, string> = {
  ERROR: PALETTE.danger, CRITICAL: PALETTE.danger, WARNING: PALETTE.warning, WARN: PALETTE.warning, DEBUG: PALETTE.shellMuted,
}

/** Timestamp dimmed, level coloured, message as is. */
function LogLine({ line }: { line: string }) {
  const m = line.match(/^(\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(?:[.,]\d+)?)\s+(\w+)\s+(.*)$/s)
  const rowSx = { whiteSpace: 'pre-wrap', wordBreak: 'break-all', py: 0.15, '&:hover': { bgcolor: 'rgba(167,139,250,0.05)' } } as const
  if (!m) return <Box component="div" sx={rowSx}>{line}</Box>
  const [, ts, level, rest] = m
  return (
    <Box component="div" sx={rowSx}>
      <Box component="span" sx={{ color: PALETTE.shellMuted, opacity: 0.7 }}>{ts} </Box>
      <Box component="span" sx={{ color: LEVEL_COLOR[level] ?? PALETTE.info, fontWeight: 600 }}>{level} </Box>
      <Box component="span" sx={{ color: LEVEL_COLOR[level] === PALETTE.danger ? PALETTE.danger : undefined }}>{rest}</Box>
    </Box>
  )
}

export default function LogsPage() {
  const { t } = useOpsLocale()
  const [service, setService] = useState('')
  const [searchParams] = useSearchParams()
  const [room, setRoom] = useState(() => searchParams.get('room') ?? '')
  const [conv, setConv] = useState('')
  const [q, setQ] = useState('')
  const { lines, status, bottomRef } = useLogStream({ service, room, conv, q, enabled: true })

  const statusLabel =
    status === 'live' ? t.logs.live : status === 'connecting' ? t.logs.connecting : t.logs.disconnected

  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>{t.logs.service}</InputLabel>
          <Select
            label={t.logs.service}
            value={service}
            onChange={e => setService(e.target.value)}
          >
            <MenuItem value="">{t.logs.allServices}</MenuItem>
            {LOG_SERVICE_IDS.map(id => (
              <MenuItem key={id} value={id}>{id}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField size="small" label={t.logs.room} value={room} onChange={e => setRoom(e.target.value)} />
        <TextField size="small" label={t.logs.conv} value={conv} onChange={e => setConv(e.target.value)} />
        <TextField size="small" label={t.logs.query} value={q} onChange={e => setQ(e.target.value)} sx={{ flex: 1 }} />
        <Chip
          label={statusLabel}
          color={status === 'live' ? 'success' : status === 'connecting' ? 'default' : 'error'}
          sx={{ alignSelf: { xs: 'flex-start', md: 'center' }, minHeight: 44 }}
        />
      </Stack>

      <Box
        sx={{
          fontFamily: '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace',
          fontSize: 12.5,
          lineHeight: 1.6,
          bgcolor: PALETTE.codeBg,
          border: `1px solid ${PALETTE.shellBorder}`,
          borderRadius: 2,
          p: 2,
          height: { xs: 420, md: 560 },
          overflow: 'auto',
          color: PALETTE.shellText,
        }}
      >
        {lines.length === 0 ? (
          <Typography variant="body2" sx={{ color: PALETTE.shellMuted }}>{t.logs.empty}</Typography>
        ) : (
          lines.map((line, i) => (
            <LogLine key={`${i}-${line.slice(0, 24)}`} line={line} />
          ))
        )}
        <div ref={bottomRef} />
      </Box>
    </Stack>
  )
}
