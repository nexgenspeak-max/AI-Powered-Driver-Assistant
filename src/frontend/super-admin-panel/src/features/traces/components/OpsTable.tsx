import { useState } from 'react'
import {
  Box, Chip, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, ToggleButton, ToggleButtonGroup, Typography,
} from '@mui/material'
import { alpha } from '@mui/material/styles'
import { PALETTE } from '../../../styles/palette'
import { useOpsLocale } from '../../../i18n/useOpsLocale'
import type { ErrorEvent, OpEvent, TraceEvent } from '../types'
import { fmtMs, fmtOffset, MONO_FONT, opSummary } from '../format'

type Filter = 'all' | 'ok' | 'failed'
type Row = OpEvent | ErrorEvent

const SUMMARY_KEYS = new Set(['method', 'path', 'status', 'error', 'duration_ms'])
const MONO_CELL = { fontFamily: MONO_FONT, fontSize: 12 }

function isRow(e: TraceEvent): e is Row {
  return e.kind === 'op' || e.kind === 'error'
}

function failed(row: Row): boolean {
  return row.kind === 'error' || row.ok === false
}

function details(row: Row): string {
  if (row.kind === 'error') return `${row.where ?? ''} ${row.message ?? ''}`.trim()
  return Object.entries(row.fields ?? {})
    .filter(([k, v]) => !SUMMARY_KEYS.has(k) && v !== null && v !== undefined && v !== '')
    .map(([k, v]) => `${k}=${typeof v === 'object' ? JSON.stringify(v) : String(v)}`)
    .join(' ')
}

/** Every operational event of the session (backend HTTP, fillers, agent state, …) in one dense table. */
export function OpsTable({ events, startTs }: { events: TraceEvent[]; startTs?: number }) {
  const { t } = useOpsLocale()
  const O = t.traces.opsTable
  const [filter, setFilter] = useState<Filter>('all')
  const rows = events.filter(isRow).filter(r => filter === 'all' || (filter === 'failed') === failed(r))

  return (
    <Box>
      <ToggleButtonGroup
        size="small"
        exclusive
        value={filter}
        onChange={(_, v: Filter | null) => v && setFilter(v)}
        sx={{ mb: 2, '& .MuiToggleButton-root': { minHeight: 44, px: 2 } }}
      >
        <ToggleButton value="all">{O.all}</ToggleButton>
        <ToggleButton value="ok">{O.ok}</ToggleButton>
        <ToggleButton value="failed">{O.failed}</ToggleButton>
      </ToggleButtonGroup>
      {rows.length === 0 ? (
        <Typography color="text.secondary">{O.empty}</Typography>
      ) : (
        <TableContainer sx={{ maxHeight: { md: 'calc(100vh - 360px)' }, border: `1px solid ${PALETTE.shellBorder}`, borderRadius: 1 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>{O.time}</TableCell>
                <TableCell>{O.turn}</TableCell>
                <TableCell>{O.name}</TableCell>
                <TableCell>{O.result}</TableCell>
                <TableCell>{O.target}</TableCell>
                <TableCell align="right">{O.duration}</TableCell>
                <TableCell>{O.detail}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map(r => {
                const bad = failed(r)
                const duration = r.kind === 'op' ? r.fields?.duration_ms : undefined
                return (
                  <TableRow key={r.seq} sx={{ bgcolor: bad ? alpha(PALETTE.danger, 0.08) : undefined }}>
                    <TableCell sx={{ ...MONO_CELL, whiteSpace: 'nowrap' }}>{fmtOffset(r.ts, startTs)}</TableCell>
                    <TableCell>{r.turn}</TableCell>
                    <TableCell sx={MONO_CELL}>{r.kind === 'op' ? r.name : 'error'}</TableCell>
                    <TableCell>
                      <Chip size="small" variant="outlined" color={bad ? 'error' : 'success'} label={bad ? O.failed : O.ok} />
                    </TableCell>
                    <TableCell sx={MONO_CELL}>{r.kind === 'op' ? opSummary(r) : ''}</TableCell>
                    <TableCell align="right" sx={MONO_CELL}>{typeof duration === 'number' ? fmtMs(duration) : ''}</TableCell>
                    <TableCell sx={{ ...MONO_CELL, color: bad ? PALETTE.danger : 'text.secondary', wordBreak: 'break-word' }}>
                      {details(r)}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  )
}
