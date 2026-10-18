import {
  Box, CircularProgress, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Typography,
} from '@mui/material'
import type { Customer, CustomerStatus } from '../../../types'
import { useAdminContent } from '../../../i18n/useAdminContent'
import { StatusPill } from '../../../components/StatusPill'
import { LockButton, PersonCell, SearchBar } from '../../../components/PeopleCells'
import { usePeopleSearch } from '../../../components/usePeopleSearch'
import { tableEmptyCellSx, tableRowSx } from '../../../styles/shellStyles'
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
  const { query, setQuery, filtered } = usePeopleSearch(customers)
  const headers = [cols.name, cols.phone, cols.email, cols.status, cols.joined, cols.actions]

  return (
    <Box>
    <SearchBar value={query} onChange={setQuery} placeholder={c.common.searchPeople} />
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            {headers.map((h, i) => (
              <TableCell key={i}>{h}</TableCell>
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
          ) : filtered.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} align="center" sx={tableEmptyCellSx}>
                {c.common.noCustomers}
              </TableCell>
            </TableRow>
          ) : (
            filtered.map(cust => {
              const locked = cust.status === 'locked'
              return (
                <TableRow key={cust.id} hover sx={tableRowSx}>
                  <TableCell><PersonCell name={cust.name} /></TableCell>
                  <TableCell sx={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{cust.phone}</TableCell>
                  <TableCell sx={{ fontSize: 12, color: 'text.secondary' }}>{cust.email || '—'}</TableCell>
                  <TableCell>
                    <StatusPill label={accountStatusLabel(cust.status)} tone={STATUS_COLOR[cust.status]} />
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary">
                      {formatDate(cust.created_at)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <LockButton
                      locked={locked}
                      disabled={isPending}
                      lockLabel={c.common.lock}
                      unlockLabel={c.common.unlock}
                      onClick={() => {
                        if (!locked && !window.confirm(c.common.confirmLock(cust.name))) return
                        lockCustomer({ id: cust.id, locked: !locked })
                      }}
                    />
                  </TableCell>
                </TableRow>
              )
            })
          )}
        </TableBody>
      </Table>
    </TableContainer>
    </Box>
  )
}
