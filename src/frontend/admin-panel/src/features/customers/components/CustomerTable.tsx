import {
  Button, Chip, CircularProgress, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Typography,
} from '@mui/material'
import type { Customer, CustomerStatus } from '../../../types'
import { PALETTE } from '../../../styles/palette'
import { useLockCustomer } from '../hooks/useLockCustomer'

type Props = { customers: Customer[]; loading: boolean }

const STATUS_COLOR: Record<CustomerStatus, 'success' | 'default' | 'error'> = {
  online: 'success',
  offline: 'default',
  locked: 'error',
}

export function CustomerTable({ customers, loading }: Props) {
  const { mutate: lockCustomer, isPending } = useLockCustomer()

  return (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow sx={{ bgcolor: PALETTE.surface }}>
            {['Name', 'Phone', 'Email', 'Status', 'Joined', 'Actions'].map((h, i) => (
              <TableCell key={i} sx={{ fontWeight: 600, fontSize: 12, color: '#6b7280' }}>{h}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                <CircularProgress size={24} />
              </TableCell>
            </TableRow>
          ) : customers.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} align="center" sx={{ py: 6, color: '#9ca3af' }}>
                No customers registered
              </TableCell>
            </TableRow>
          ) : (
            customers.map(c => {
              const locked = c.status === 'locked'
              return (
                <TableRow key={c.id} hover sx={{ '&:last-child td': { borderBottom: 0 } }}>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>{c.name}</Typography>
                  </TableCell>
                  <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>{c.phone}</TableCell>
                  <TableCell sx={{ fontSize: 12, color: PALETTE.gray }}>{c.email || '—'}</TableCell>
                  <TableCell>
                    <Chip label={c.status} size="small" color={STATUS_COLOR[c.status]} />
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(c.created_at).toLocaleDateString()}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Button
                      size="small"
                      variant="outlined"
                      color={locked ? 'success' : 'error'}
                      disabled={isPending}
                      onClick={() => {
                        if (!locked && !window.confirm(`Lock ${c.name}'s account? They won't be able to log in.`)) return
                        lockCustomer({ id: c.id, locked: !locked })
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
