import {
  Button, Chip, CircularProgress, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Typography,
} from '@mui/material'
import type { Customer, CustomerStatus } from '../../../types'
import { useAdminContent } from '../../../i18n/useAdminContent'
import { tableEmptyCellSx, tableHeadCellSx, tableHeadRowSx, tableRowSx } from '../../../styles/shellStyles'
import { formatDate } from '../../../utils/format'
import { useLockCustomer } from '../hooks/useLockCustomer'

type Props = { customers: Customer[]; loading: boolean }

const STATUS_COLOR: Record<CustomerStatus, 'success' | 'default' | 'error'> = {
  online: 'success',
  offline: 'default',
  locked: 'error',
}

export function CustomerTable({ customers, loading }: Props) {
  const { mutate: lockCustomer, isPending } = useLockCustomer()
  const { c, accountStatusLabel } = useAdminContent()
  const cols = c.table.customer
  const headers = [cols.name, cols.phone, cols.email, cols.status, cols.joined, cols.actions]

  return (
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
          {loading ? (
            <TableRow>
              <TableCell colSpan={6} align="center" sx={tableEmptyCellSx}>
                <CircularProgress size={24} />
              </TableCell>
            </TableRow>
          ) : customers.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} align="center" sx={tableEmptyCellSx}>
                {c.common.noCustomers}
              </TableCell>
            </TableRow>
          ) : (
            customers.map(cust => {
              const locked = cust.status === 'locked'
              return (
                <TableRow key={cust.id} hover sx={tableRowSx}>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>{cust.name}</Typography>
                  </TableCell>
                  <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>{cust.phone}</TableCell>
                  <TableCell sx={{ fontSize: 12, color: 'text.secondary' }}>{cust.email || '—'}</TableCell>
                  <TableCell>
                    <Chip label={accountStatusLabel(cust.status)} size="small" color={STATUS_COLOR[cust.status]} />
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary">
                      {formatDate(cust.created_at)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Button
                      size="small"
                      variant="outlined"
                      color={locked ? 'success' : 'error'}
                      disabled={isPending}
                      onClick={() => {
                        if (!locked && !window.confirm(c.common.confirmLock(cust.name))) return
                        lockCustomer({ id: cust.id, locked: !locked })
                      }}
                    >
                      {locked ? c.common.unlock : c.common.lock}
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
