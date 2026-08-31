import {
  Button, Chip, CircularProgress, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Typography,
} from '@mui/material'
import type { Driver } from '../../../types'
import { useAdminContent } from '../../../i18n/useAdminContent'
import { tableEmptyCellSx, tableHeadCellSx, tableHeadRowSx, tableRowSx } from '../../../styles/shellStyles'
import { formatDate } from '../../../utils/format'
import { useLockDriver } from '../hooks/useLockDriver'

type Props = { drivers: Driver[]; loading: boolean }

const STATUS_COLOR: Record<Driver['status'], 'success' | 'default' | 'error'> = {
  online: 'success',
  offline: 'default',
  locked: 'error',
}

export function DriverTable({ drivers, loading }: Props) {
  const { mutate: lockDriver, isPending } = useLockDriver()
  const { c, accountStatusLabel } = useAdminContent()
  const cols = c.table.driver
  const headers = [cols.name, cols.phone, cols.status, cols.registered, cols.actions]

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
              <TableCell colSpan={5} align="center" sx={tableEmptyCellSx}>
                <CircularProgress size={24} />
              </TableCell>
            </TableRow>
          ) : drivers.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} align="center" sx={tableEmptyCellSx}>
                {c.common.noDrivers}
              </TableCell>
            </TableRow>
          ) : (
            drivers.map(d => {
              const locked = d.status === 'locked'
              const registered = formatDate(d.created_at ?? d.registered_at)
              return (
                <TableRow key={d.phone} hover sx={tableRowSx}>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>{d.name}</Typography>
                  </TableCell>
                  <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>{d.phone}</TableCell>
                  <TableCell>
                    <Chip label={accountStatusLabel(d.status)} size="small" color={STATUS_COLOR[d.status]} />
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary">
                      {registered}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Button
                      size="small"
                      variant="outlined"
                      color={locked ? 'success' : 'error'}
                      disabled={isPending}
                      onClick={() => {
                        if (!locked && !window.confirm(c.common.confirmLock(d.name))) return
                        lockDriver({ id: d.id, locked: !locked })
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
