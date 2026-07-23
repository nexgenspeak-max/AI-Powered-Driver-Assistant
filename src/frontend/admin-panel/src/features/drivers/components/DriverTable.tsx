import {
  Button, Chip, CircularProgress, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Typography,
} from '@mui/material'
import type { Driver } from '../../../types'
import { PALETTE } from '../../../styles/palette'
import { useLockDriver } from '../hooks/useLockDriver'

type Props = { drivers: Driver[]; loading: boolean }

const STATUS_COLOR: Record<Driver['status'], 'success' | 'default' | 'error'> = {
  online: 'success',
  offline: 'default',
  locked: 'error',
}

export function DriverTable({ drivers, loading }: Props) {
  const { mutate: lockDriver, isPending } = useLockDriver()

  return (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow sx={{ bgcolor: PALETTE.surface }}>
            {['Name', 'Phone', 'Status', 'Registered', 'Actions'].map((h, i) => (
              <TableCell key={i} sx={{ fontWeight: 600, fontSize: 12, color: '#6b7280' }}>{h}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                <CircularProgress size={24} />
              </TableCell>
            </TableRow>
          ) : drivers.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} align="center" sx={{ py: 6, color: '#9ca3af' }}>
                No drivers registered
              </TableCell>
            </TableRow>
          ) : (
            drivers.map(d => {
              const locked = d.status === 'locked'
              return (
                <TableRow key={d.phone} hover sx={{ '&:last-child td': { borderBottom: 0 } }}>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>{d.name}</Typography>
                  </TableCell>
                  <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>{d.phone}</TableCell>
                  <TableCell>
                    <Chip label={d.status} size="small" color={STATUS_COLOR[d.status]} />
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(d.registered_at).toLocaleDateString()}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Button
                      size="small"
                      variant="outlined"
                      color={locked ? 'success' : 'error'}
                      disabled={isPending}
                      onClick={() => {
                        if (!locked && !window.confirm(`Lock ${d.name}'s account? They won't be able to log in.`)) return
                        lockDriver({ id: d.id, locked: !locked })
                      }}
                    >
                      {locked ? 'Unlock' : 'Lock'}
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })
          )}
        </TableBody>
      </Table>
    </TableContainer>
  )
}
