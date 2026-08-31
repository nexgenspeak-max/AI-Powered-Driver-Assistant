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
                  <TableCell>{row.caller}</TableCell>
                  <TableCell>{row.started_at}</TableCell>
                  <TableCell>{formatDuration(row.duration_seconds)}</TableCell>
                  <TableCell>{row.summary || t.calls.noSummary}</TableCell>
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
