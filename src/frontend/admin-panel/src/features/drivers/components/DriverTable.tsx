import {
  Box, CircularProgress, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Typography,
} from '@mui/material'
import type { Driver } from '../../../types'
import { useAdminContent } from '../../../i18n/useAdminContent'
import { StatusPill } from '../../../components/StatusPill'
import { LockButton, PersonCell, SearchBar } from '../../../components/PeopleCells'
import { usePeopleSearch } from '../../../components/usePeopleSearch'
import { tableEmptyCellSx, tableRowSx } from '../../../styles/shellStyles'
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
  const { query, setQuery, filtered } = usePeopleSearch(drivers)
  const headers = [cols.name, cols.phone, cols.status, cols.registered, cols.actions]

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
              <TableCell colSpan={5} align="center" sx={tableEmptyCellSx}>
                <CircularProgress size={24} />
              </TableCell>
            </TableRow>
          ) : filtered.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} align="center" sx={tableEmptyCellSx}>
                {c.common.noDrivers}
              </TableCell>
            </TableRow>
          ) : (
            filtered.map(d => {
              const locked = d.status === 'locked'
              const registered = formatDate(d.created_at ?? d.registered_at)
              return (
                <TableRow key={d.phone} hover sx={tableRowSx}>
                  <TableCell><PersonCell name={d.name} /></TableCell>
                  <TableCell sx={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{d.phone}</TableCell>
                  <TableCell>
                    <StatusPill label={accountStatusLabel(d.status)} tone={STATUS_COLOR[d.status]} />
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary">
                      {registered}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <LockButton
                      locked={locked}
                      disabled={isPending}
                      lockLabel={c.common.lock}
                      unlockLabel={c.common.unlock}
                      onClick={() => {
                        if (!locked && !window.confirm(c.common.confirmLock(d.name))) return
                        lockDriver({ id: d.id, locked: !locked })
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
