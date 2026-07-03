import { useState } from 'react'
import {
  Box, Button, Chip, CircularProgress, FormControl, MenuItem,
  Select, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Typography,
} from '@mui/material'
import type { Driver, Trip, TripStatus } from '../../../types'
import { DISPATCHABLE_STATUSES, TRIP_STATUSES } from '../../../constants/status'
import { TripStatusChip } from './TripStatusChip'

type Props = {
  trips: Trip[]
  drivers: Driver[]
  loading: boolean
  statusFilter: string
  onStatusFilter: (filter: string) => void
  onDispatch: (vars: { trip_id: string; driver_phone: string }) => void
  dispatching: boolean
}

export function TripTable({ trips, drivers, loading, statusFilter, onStatusFilter, onDispatch, dispatching }: Props) {
  const [selected, setSelected] = useState<Record<string, string>>({})

  return (
    <Box>
      {/* Status filter bar */}
      <Box sx={{ p: 2, borderBottom: '1px solid #e8eaf0', display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        <Chip
          label="All"
          size="small"
          onClick={() => onStatusFilter('')}
          color={statusFilter === '' ? 'primary' : 'default'}
          variant={statusFilter === '' ? 'filled' : 'outlined'}
        />
        {TRIP_STATUSES.map(s => (
          <Chip
            key={s}
            label={s}
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
            <TableRow sx={{ bgcolor: '#f8f9fc' }}>
              {['Trip ID', 'Customer', 'Pickup', 'Dropoff', 'Status', 'Assign Driver', 'Booked via', ''].map((h, i) => (
                <TableCell key={i} sx={{ fontWeight: 600, fontSize: 12, color: '#6b7280' }}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                  <CircularProgress size={24} />
                </TableCell>
              </TableRow>
            ) : trips.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 6, color: '#9ca3af' }}>
                  No trips found
                </TableCell>
              </TableRow>
            ) : (
              trips.map(trip => {
                const canDispatch = DISPATCHABLE_STATUSES.includes(trip.status as TripStatus)
                const driverPhone = selected[trip.trip_id] ?? ''

                return (
                  <TableRow key={trip.trip_id} hover sx={{ '&:last-child td': { borderBottom: 0 } }}>
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: 12, color: '#6b7280' }}>
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
                            <MenuItem value=""><em>Select driver</em></MenuItem>
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
                      {canDispatch && (
                        <Button
                          size="small"
                          variant="contained"
                          disabled={!driverPhone || dispatching}
                          onClick={() => onDispatch({ trip_id: trip.trip_id, driver_phone: driverPhone })}
                          sx={{ whiteSpace: 'nowrap' }}
                        >
                          Dispatch
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
