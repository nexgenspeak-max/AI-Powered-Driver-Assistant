import { useState } from 'react'
import {
  Box, Button, Chip, CircularProgress, FormControl, MenuItem,
  Select, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Typography,
} from '@mui/material'
import type { Customer, Driver, Trip } from '../../../types'
import { DISPATCHABLE_STATUSES, TRIP_STATUSES, normalizeTripStatus } from '../../../constants/status'
import { useAdminContent } from '../../../i18n/useAdminContent'
import { TripStatusChip } from './TripStatusChip'
import { PALETTE } from '../../../styles/palette'
import { tableEmptyCellSx, tableHeadCellSx, tableHeadRowSx, tableRowSx } from '../../../styles/shellStyles'
import { resolveAccountName } from '../utils/resolveAccountName'

type Props = {
  trips: Trip[]
  drivers: Driver[]
  customers: Customer[]
  loading: boolean
  statusFilter: string
  onStatusFilter: (filter: string) => void
  onDispatch: (vars: { trip_id: string; driver_phone: string }) => void
  dispatching: boolean
}

export function TripTable({ trips, drivers, customers, loading, statusFilter, onStatusFilter, onDispatch, dispatching }: Props) {
  const [selected, setSelected] = useState<Record<string, string>>({})
  const { c, tripStatusLabel } = useAdminContent()
  const cols = c.table.trip

  return (
    <Box>
      <Box sx={{ p: 2, borderBottom: `1px solid ${PALETTE.shellBorder}`, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        <Chip
          label={c.common.all}
          size="small"
          onClick={() => onStatusFilter('')}
          color={statusFilter === '' ? 'primary' : 'default'}
          variant={statusFilter === '' ? 'filled' : 'outlined'}
        />
        {TRIP_STATUSES.map(s => (
          <Chip
            key={s}
            label={tripStatusLabel(s)}
            size="small"
            onClick={() => onStatusFilter(s)}
            color={statusFilter === s ? 'primary' : 'default'}
            variant={statusFilter === s ? 'filled' : 'outlined'}
          />
        ))}
      </Box>

      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow sx={tableHeadRowSx}>
              {[cols.tripId, cols.customer, cols.pickup, cols.dropoff, cols.status, cols.assignDriver, cols.bookedVia, cols.accountName, ''].map((h, i) => (
                <TableCell key={i} sx={tableHeadCellSx}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={tableEmptyCellSx}>
                  <CircularProgress size={24} />
                </TableCell>
              </TableRow>
            ) : trips.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={tableEmptyCellSx}>
                  {c.common.noTrips}
                </TableCell>
              </TableRow>
            ) : (
              trips.map(trip => {
                const canDispatch = DISPATCHABLE_STATUSES.includes(normalizeTripStatus(trip.status))
                const driverPhone = selected[trip.trip_id] ?? ''

                return (
                  <TableRow key={trip.trip_id} hover sx={tableRowSx}>
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: 12, color: 'text.secondary' }}>
                      {trip.trip_id.slice(0, 8)}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>{trip.customer_name}</Typography>
                      <Typography variant="caption" color="text.secondary">{trip.customer_phone}</Typography>
                    </TableCell>
                    <TableCell sx={{ maxWidth: 160 }}>
                      <Typography variant="body2" noWrap>{trip.pickup_address}</Typography>
                    </TableCell>
                    <TableCell sx={{ maxWidth: 160 }}>
                      <Typography variant="body2" noWrap>{trip.dropoff_address}</Typography>
                    </TableCell>
                    <TableCell>
                      <TripStatusChip status={trip.status} />
                    </TableCell>
                    <TableCell>
                      {canDispatch ? (
                        <FormControl size="small" sx={{ minWidth: 160 }}>
                          <Select
                            value={driverPhone}
                            onChange={e => setSelected(prev => ({ ...prev, [trip.trip_id]: e.target.value }))}
                            displayEmpty
                          >
                            <MenuItem value=""><em>{c.common.selectDriver}</em></MenuItem>
                            {drivers.filter(d => d.status === 'online').map(d => (
                              <MenuItem key={d.phone} value={d.phone}>
                                {d.name} ({d.phone})
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          {trip.driver_phone || '—'}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">{trip.booked_via || '—'}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {resolveAccountName(trip, customers) ?? '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {canDispatch && (
                        <Button
                          size="small"
                          variant="contained"
                          disabled={!driverPhone || dispatching}
                          onClick={() => onDispatch({ trip_id: trip.trip_id, driver_phone: driverPhone })}
                          sx={{ whiteSpace: 'nowrap' }}
                        >
                          {c.common.dispatch}
                        </Button>
                      )}
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
