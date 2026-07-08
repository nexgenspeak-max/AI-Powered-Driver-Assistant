import {
  Box, Card, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Typography, CircularProgress, Stack, Chip, TextField, InputAdornment, Avatar,
} from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import PhoneInTalkIcon from '@mui/icons-material/PhoneInTalk'
import { formatDateTime, formatDuration } from '../../../utils/format'
import type { CallLog } from '../../../types'
import { PALETTE } from '../../../styles/palette'

type Props = {
  logs: CallLog[]
  loading: boolean
  callerFilter: string
  onCallerFilterChange: (value: string) => void
  onSelectCall: (callId: string) => void
}

export function CallLogsTable({ logs, loading, callerFilter, onCallerFilterChange, onSelectCall }: Props) {
  return (
    <Box>
      <Stack direction="row" spacing={2} sx={{ mb: 3, alignItems: 'center' }}>
        <TextField
          size="small"
          placeholder="Filter by phone..."
          value={callerFilter}
          onChange={e => onCallerFilterChange(e.target.value)}
          sx={{ width: 240 }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                </InputAdornment>
              ),
            },
          }}
        />
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {logs.length} record{logs.length !== 1 ? 's' : ''}
        </Typography>
      </Stack>

      <Card elevation={0} sx={{ borderRadius: 3 }}>
        <Box sx={{ px: 3, py: 2, borderBottom: `1px solid ${PALETTE.border}` }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Call Logs</Typography>
        </Box>

        <TableContainer component={Paper} elevation={0}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: PALETTE.surface }}>
                {['Caller', 'Started', 'Duration', 'Summary', ''].map((h, i) => (
                  <TableCell key={i} sx={{ fontWeight: 600, fontSize: 12, color: '#6b7280', borderBottom: `1px solid ${PALETTE.border}` }}>
                    {h}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 4 }}><CircularProgress size={24} /></TableCell>
                </TableRow>
              )}
              {!loading && logs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 4, color: '#9ca3af' }}>No call records found</TableCell>
                </TableRow>
              )}
              {logs.map(log => (
                <TableRow key={log.call_id} hover sx={{ cursor: 'pointer', '&:last-child td': { borderBottom: 0 } }}
                  onClick={() => onSelectCall(log.call_id)}
                >
                  <TableCell>
                    <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                      <Avatar sx={{ width: 28, height: 28, bgcolor: PALETTE.chipBg, color: PALETTE.base }}>
                        <PhoneInTalkIcon sx={{ fontSize: 14 }} />
                      </Avatar>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{log.caller}</Typography>
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>{formatDateTime(log.started_at)}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label={formatDuration(log.duration_seconds)} size="small" sx={{ fontSize: 11, bgcolor: PALETTE.chipBg, color: PALETTE.base }} />
                  </TableCell>
                  <TableCell sx={{ maxWidth: 280 }}>
                    <Typography variant="caption" sx={{ color: 'text.secondary', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {log.summary || '—'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" sx={{ color: PALETTE.base }}>View →</Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <Box sx={{ px: 3, py: 1.5, borderTop: `1px solid ${PALETTE.border}` }}>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>Auto-refreshes every 10s · Click a row to view transcript</Typography>
        </Box>
      </Card>
    </Box>
  )
}
