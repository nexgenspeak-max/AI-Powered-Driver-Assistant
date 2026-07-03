import {
  Chip, CircularProgress, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Typography,
} from '@mui/material'
import type { Driver } from '../../../types'

type Props = { drivers: Driver[]; loading: boolean }

export function DriverTable({ drivers, loading }: Props) {
  return (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow sx={{ bgcolor: '#f8f9fc' }}>
            {['Name', 'Phone', 'Status', 'Registered'].map((h, i) => (
              <TableCell key={i} sx={{ fontWeight: 600, fontSize: 12, color: '#6b7280' }}>{h}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={4} align="center" sx={{ py: 6 }}>
                <CircularProgress size={24} />
              </TableCell>
            </TableRow>
          ) : drivers.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} align="center" sx={{ py: 6, color: '#9ca3af' }}>
                No drivers registered
              </TableCell>
            </TableRow>
          ) : (
            drivers.map(d => (
              <TableRow key={d.phone} hover sx={{ '&:last-child td': { borderBottom: 0 } }}>
                <TableCell>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>{d.name}</Typography>
                </TableCell>
                <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>{d.phone}</TableCell>
                <TableCell>
                  <Chip
                    label={d.status}
                    size="small"
                    color={d.status === 'online' ? 'success' : 'default'}
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="caption" color="text.secondary">
                    {new Date(d.registered_at).toLocaleDateString()}
                  </Typography>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  )
}
