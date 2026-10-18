import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Alert, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography,
} from '@mui/material'
import { opsService } from '../services/api/ops'
import { useOpsLocale } from '../i18n/useOpsLocale'
import { TranscriptDialog } from '../features/calls/TranscriptDialog'

function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds))
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m}:${String(r).padStart(2, '0')}`
}

function formatStarted(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function CallsPage() {
  const { t } = useOpsLocale()
  const [callId, setCallId] = useState<string | null>(null)
  const { data, error, isLoading } = useQuery({
    queryKey: ['ops-records'],
    queryFn: () => opsService.listRecords({ limit: 50 }),
  })

  return (
    <>
      {error ? <Alert severity="error" sx={{ mb: 2 }}>{t.calls.empty}</Alert> : null}
      {!isLoading && !data?.length ? (
        <Typography color="text.secondary">{t.calls.empty}</Typography>
      ) : null}
      {data && data.length > 0 ? (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t.calls.caller}</TableCell>
                <TableCell>{t.calls.started}</TableCell>
                <TableCell>{t.calls.duration}</TableCell>
                <TableCell>{t.calls.summary}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.map(row => (
                <TableRow
                  key={row.call_id}
                  hover
                  onClick={() => setCallId(row.call_id)}
                  sx={{ cursor: 'pointer', minHeight: 44 }}
                >
                  <TableCell sx={{ whiteSpace: 'nowrap', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{row.caller}</TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap', color: 'text.secondary', fontVariantNumeric: 'tabular-nums' }}>{formatStarted(row.started_at)}</TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{formatDuration(row.duration_seconds)}</TableCell>
                  <TableCell sx={{ color: row.summary ? 'text.primary' : 'text.secondary', lineHeight: 1.5 }}>{row.summary || t.calls.noSummary}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : null}
      <TranscriptDialog
        callId={callId ?? ''}
        open={!!callId}
        onClose={() => setCallId(null)}
      />
    </>
  )
}
