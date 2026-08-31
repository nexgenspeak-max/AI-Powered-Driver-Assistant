import {
  Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Typography, CircularProgress, Stack, Chip, TextField, InputAdornment, Avatar,
} from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import PhoneInTalkIcon from '@mui/icons-material/PhoneInTalk'
import { formatDateTime, formatDuration } from '../../../utils/format'
import type { CallLog } from '../../../types'
import { PALETTE } from '../../../styles/palette'
import { useAdminContent } from '../../../i18n/useAdminContent'
import { tableEmptyCellSx, tableHeadCellSx, tableHeadRowSx, tableRowSx } from '../../../styles/shellStyles'

type Props = {
  logs: CallLog[]
  loading: boolean
  callerFilter: string
  onCallerFilterChange: (value: string) => void
  onSelectCall: (callId: string) => void
}

export function CallLogsTable({ logs, loading, callerFilter, onCallerFilterChange, onSelectCall }: Props) {
  const { c } = useAdminContent()
  const cols = c.table.callLogs
  const headers = [cols.caller, cols.started, cols.duration, cols.summary, '']

  return (
    <Box>
      <Stack direction="row" spacing={2} sx={{ p: 2, alignItems: 'center', borderBottom: `1px solid ${PALETTE.shellBorder}` }}>
        <TextField
          size="small"
          placeholder={c.common.filterByPhone}
          value={callerFilter}
          onChange={e => onCallerFilterChange(e.target.value)}
          sx={{ width: { xs: '100%', sm: 240 } }}
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
        <Typography variant="caption" sx={{ color: 'text.secondary', flexShrink: 0 }}>
          {c.common.records(logs.length)}
        </Typography>
      </Stack>

      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow sx={tableHeadRowSx}>
              {headers.map((h, i) => (
                <TableCell key={i} sx={tableHeadCellSx}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={tableEmptyCellSx}>
                  <CircularProgress size={24} />
                </TableCell>
              </TableRow>
            )}
            {!loading && logs.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={tableEmptyCellSx}>
                  {c.common.noCallLogs}
                </TableCell>
              </TableRow>
            )}
            {logs.map(log => (
              <TableRow
                key={log.call_id}
                hover
                sx={{ ...tableRowSx, cursor: 'pointer' }}
                onClick={() => onSelectCall(log.call_id)}
              >
                <TableCell>
                  <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                    <Avatar sx={{ width: 28, height: 28, bgcolor: 'rgba(124, 91, 156, 0.25)', color: PALETTE.light }}>
                      <PhoneInTalkIcon sx={{ fontSize: 14 }} />
                    </Avatar>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{log.caller}</Typography>
                  </Stack>
                </TableCell>
                <TableCell>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>{formatDateTime(log.started_at)}</Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    label={formatDuration(log.duration_seconds)}
                    size="small"
                    sx={{ fontSize: 11, bgcolor: 'rgba(124, 91, 156, 0.22)', color: PALETTE.light }}
                  />
                </TableCell>
                <TableCell sx={{ maxWidth: 280 }}>
                  <Typography variant="caption" sx={{ color: 'text.secondary', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {log.summary || '—'}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="caption" sx={{ color: PALETTE.light }}>{c.common.view}</Typography>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Box sx={{ px: 2, py: 1.5, borderTop: `1px solid ${PALETTE.shellBorder}` }}>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {c.common.callLogsHint}
        </Typography>
      </Box>
    </Box>
  )
}
