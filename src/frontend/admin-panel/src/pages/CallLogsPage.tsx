import { useState } from 'react'
import {
  Box, Card, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Typography, CircularProgress, Stack, Chip, TextField, InputAdornment,
  Dialog, DialogTitle, DialogContent, IconButton, Divider, Avatar,
} from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import CloseIcon from '@mui/icons-material/Close'
import PhoneInTalkIcon from '@mui/icons-material/PhoneInTalk'
import { useCallLogs, useCallLog } from '../features/call-logs/hooks/useCallLogs'
import { formatDateTime } from '../utils/format'
import type { CallLog } from '../types'

function formatDuration(secs: number): string {
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}

interface TranscriptDialogProps {
  callId: string
  open: boolean
  onClose: () => void
}

function TranscriptDialog({ callId, open, onClose }: TranscriptDialogProps) {
  const { data, isLoading } = useCallLog(callId)

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth
      slotProps={{ paper: { sx: { borderRadius: 3 } } }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <PhoneInTalkIcon sx={{ color: '#6c8aff', fontSize: 20 }} />
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Call Transcript</Typography>
        </Stack>
        <IconButton size="small" onClick={onClose}><CloseIcon fontSize="small" /></IconButton>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ pt: 2 }}>
        {isLoading && <Box sx={{ textAlign: 'center', py: 4 }}><CircularProgress size={24} /></Box>}
        {data && (
          <Stack spacing={2}>
            <Box sx={{ p: 2, bgcolor: '#f8f9fc', borderRadius: 2 }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }}>Summary</Typography>
              <Typography variant="body2">{data.summary || 'No summary available'}</Typography>
            </Box>

            <Stack spacing={1}>
              {data.turns.map((turn, i) => (
                <Box key={i} sx={{ display: 'flex', justifyContent: turn.role === 'assistant' ? 'flex-start' : 'flex-end' }}>
                  <Box sx={{
                    maxWidth: '80%', px: 1.5, py: 1, borderRadius: 2,
                    bgcolor: turn.role === 'assistant' ? '#f0f2ff' : '#6c8aff',
                    color: turn.role === 'assistant' ? 'text.primary' : '#fff',
                  }}>
                    <Typography variant="caption" sx={{ opacity: 0.7, display: 'block', mb: 0.25 }}>
                      {turn.role === 'assistant' ? 'AI Agent' : 'Driver'}
                    </Typography>
                    <Typography variant="body2">{turn.text}</Typography>
                  </Box>
                </Box>
              ))}
            </Stack>

            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>STT: {data.stt_provider || '—'}</Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>LLM: {data.llm_model || '—'}</Typography>
            </Box>
          </Stack>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default function CallLogsPage() {
  const [callerFilter, setCallerFilter] = useState('')
  const [selectedCallId, setSelectedCallId] = useState('')

  const { data: logs = [], isLoading } = useCallLogs(callerFilter || undefined)

  return (
    <Box>
      <Stack direction="row" spacing={2} sx={{ mb: 3, alignItems: 'center' }}>
        <TextField
          size="small"
          placeholder="Filter by phone..."
          value={callerFilter}
          onChange={e => setCallerFilter(e.target.value)}
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

      <Card elevation={0} sx={{ border: '1px solid #e8eaf0', borderRadius: 3 }}>
        <Box sx={{ px: 3, py: 2, borderBottom: '1px solid #f0f2f8' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Call Logs</Typography>
        </Box>

        <TableContainer component={Paper} elevation={0}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: '#f8f9fc' }}>
                {['Caller', 'Started', 'Duration', 'Summary', ''].map((h, i) => (
                  <TableCell key={i} sx={{ fontWeight: 600, fontSize: 12, color: '#6b7280', borderBottom: '1px solid #e8eaf0' }}>
                    {h}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 4 }}><CircularProgress size={24} /></TableCell>
                </TableRow>
              )}
              {!isLoading && logs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 4, color: '#9ca3af' }}>No call records found</TableCell>
                </TableRow>
              )}
              {(logs as CallLog[]).map(log => (
                <TableRow key={log.call_id} hover sx={{ cursor: 'pointer', '&:last-child td': { borderBottom: 0 } }}
                  onClick={() => setSelectedCallId(log.call_id)}
                >
                  <TableCell>
                    <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                      <Avatar sx={{ width: 28, height: 28, bgcolor: '#e8eaf0', color: '#6c8aff' }}>
                        <PhoneInTalkIcon sx={{ fontSize: 14 }} />
                      </Avatar>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{log.caller}</Typography>
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>{formatDateTime(log.started_at)}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label={formatDuration(log.duration_seconds)} size="small" sx={{ fontSize: 11, bgcolor: '#f0f2ff', color: '#6c8aff' }} />
                  </TableCell>
                  <TableCell sx={{ maxWidth: 280 }}>
                    <Typography variant="caption" sx={{ color: 'text.secondary', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {log.summary || '—'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" sx={{ color: '#6c8aff' }}>View →</Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <Box sx={{ px: 3, py: 1.5, borderTop: '1px solid #f0f2f8' }}>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>Auto-refreshes every 10s · Click a row to view transcript</Typography>
        </Box>
      </Card>

      <TranscriptDialog
        callId={selectedCallId}
        open={!!selectedCallId}
        onClose={() => setSelectedCallId('')}
      />
    </Box>
  )
}
