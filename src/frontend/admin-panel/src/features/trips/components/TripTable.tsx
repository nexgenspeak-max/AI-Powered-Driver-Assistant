import { useMemo, useState } from 'react'
import {
  Box, CircularProgress, FormControl, IconButton, InputAdornment, MenuItem,
  Select, Table, TableBody, TableCell, TableContainer, TableHead,
  TablePagination, TableRow, TextField, Tooltip, Typography,
} from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import SendRoundedIcon from '@mui/icons-material/SendRounded'
import type { Customer, Driver, Trip } from '../../../types'
import { DISPATCHABLE_STATUSES, TRIP_STATUSES, normalizeTripStatus } from '../../../constants/status'
import { useAdminContent } from '../../../i18n/useAdminContent'
import { TripStatusChip } from './TripStatusChip'
import { PALETTE } from '../../../styles/palette'
import { tableEmptyCellSx, tableRowSx } from '../../../styles/shellStyles'
import { InitialsAvatar } from '../../../components/StatusPill'
import { resolveAccountName } from '../utils/resolveAccountName'

type Props = {
  /** Every trip; the table applies the status filter and search itself. */
  trips: Trip[]
  drivers: Driver[]
  customers: Customer[]
  loading: boolean
  statusFilter: string
  onStatusFilter: (filter: string) => void
  onDispatch: (vars: { trip_id: string; driver_phone: string }) => void
  dispatching: boolean
  onOpen?: (trip: Trip) => void
}

const PAGE_SIZES = [15, 30, 50]
// Fixed layout: ID, customer, route, pickup time, status, driver.
const COL_WIDTHS = ['11%', '20%', '28%', '10%', '11%', '20%']

function fold(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase()
}

function shortDateTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getDate())}/${p(d.getMonth() + 1)} ${p(d.getHours())}:${p(d.getMinutes())}`
}

function pickupLabel(v: string): string {
  // Older bookings stored a full ISO timestamp; newer ones store "HH:MM".
  return v && v.includes('T') ? shortDateTime(v) || v : v
}

function RouteCell({ pickup, dropoff }: { pickup: string; dropoff: string }) {
  const row = (color: string, text: string) => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
      <Box sx={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, bgcolor: color, boxShadow: `0 0 0 3px ${color}26` }} />
      <Tooltip title={text} placement="top-start" enterDelay={500}>
        <Typography variant="body2" noWrap sx={{ minWidth: 0 }}>{text || '—'}</Typography>
      </Tooltip>
    </Box>
  )
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.6, minWidth: 0 }}>
      {row(PALETTE.light, pickup)}
      {row(PALETTE.success, dropoff)}
    </Box>
  )
}

export function TripTable({ trips, drivers, customers, loading, statusFilter, onStatusFilter, onDispatch, dispatching, onOpen }: Props) {
  const [selected, setSelected] = useState<Record<string, string>>({})
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(PAGE_SIZES[0])
  const { c, tripStatusLabel } = useAdminContent()
  const cols = c.table.trip

  const counts = useMemo(() => {
    const m: Record<string, number> = {}
    for (const t of trips) m[normalizeTripStatus(t.status)] = (m[normalizeTripStatus(t.status)] ?? 0) + 1
    return m
  }, [trips])

  const driverByPhone = useMemo(() => new Map(drivers.map(d => [d.phone, d])), [drivers])
  const onlineDrivers = useMemo(() => drivers.filter(d => d.status === 'online'), [drivers])

  const rows = useMemo(() => {
    const q = fold(query.trim())
    return trips
      .filter(t => !statusFilter || normalizeTripStatus(t.status) === statusFilter)
      .filter(t => !q || fold([t.customer_name, t.customer_phone, t.pickup_address, t.dropoff_address, t.trip_id].join(' ')).includes(q))
      .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
  }, [trips, statusFilter, query])

  const visible = rows.slice(page * pageSize, page * pageSize + pageSize)
  const filters = ['', ...TRIP_STATUSES.filter(s => counts[s])]

  return (
    <Box>
      <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1.5, borderBottom: `1px solid ${PALETTE.shellBorder}` }}>
        <TextField
          size="small"
          placeholder={c.common.searchTrips}
          value={query}
          onChange={e => { setQuery(e.target.value); setPage(0) }}
          sx={{ maxWidth: 440 }}
          slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 18, color: 'text.secondary' }} /></InputAdornment> } }}
        />
        <Box sx={{ display: 'flex', gap: 0.75, overflowX: 'auto', pb: 0.25, '&::-webkit-scrollbar': { height: 4 } }}>
          {filters.map(s => {
            const active = statusFilter === s
            const n = s ? counts[s] ?? 0 : trips.length
            return (
              <Box
                key={s || 'all'}
                component="button"
                type="button"
                onClick={() => { onStatusFilter(s); setPage(0) }}
                sx={{
                  display: 'inline-flex', alignItems: 'center', gap: 0.75, flexShrink: 0,
                  px: 1.25, py: 0.6, borderRadius: 999, cursor: 'pointer', font: 'inherit',
                  fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap',
                  color: active ? PALETTE.shellHeading : PALETTE.shellMuted,
                  bgcolor: active ? PALETTE.shellNavActive : 'transparent',
                  border: `1px solid ${active ? PALETTE.mid : PALETTE.shellBorder}`,
                  '&:hover': { color: PALETTE.shellHeading, borderColor: PALETTE.shellBorderStrong },
                }}
              >
                {s ? tripStatusLabel(s as Trip['status']) : c.common.all}
                <Box component="span" sx={{ px: 0.75, borderRadius: 999, fontSize: 11, bgcolor: active ? `${PALETTE.mid}55` : PALETTE.shellElevated, color: active ? '#fff' : PALETTE.shellMuted }}>
                  {n}
                </Box>
              </Box>
            )
          })}
        </Box>
      </Box>

      <TableContainer>
        <Table size="small" sx={{ tableLayout: 'fixed', minWidth: 980, '& td, & th': { px: 1.5 }, '& td:first-of-type, & th:first-of-type': { pl: 2 } }}>
          <colgroup>
            {COL_WIDTHS.map((w, i) => <col key={i} style={{ width: w }} />)}
          </colgroup>
          <TableHead>
            <TableRow>
              {[cols.tripId, cols.customer, cols.route, cols.pickupTime, cols.status, cols.driver].map((h, i) => (
                <TableCell key={i}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} align="center" sx={tableEmptyCellSx}><CircularProgress size={24} /></TableCell></TableRow>
            ) : visible.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={tableEmptyCellSx}>
                  {trips.length === 0 ? c.common.noTrips : c.common.noMatches}
                </TableCell>
              </TableRow>
            ) : (
              visible.map(trip => {
                const canDispatch = DISPATCHABLE_STATUSES.includes(normalizeTripStatus(trip.status))
                const driverPhone = selected[trip.trip_id] ?? ''
                const assigned = trip.driver_phone ? driverByPhone.get(trip.driver_phone) : undefined
                const account = resolveAccountName(trip, customers)
                return (
                  <TableRow key={trip.trip_id} hover sx={{ ...tableRowSx, cursor: onOpen ? 'pointer' : undefined }} onClick={() => onOpen?.(trip)}>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                      <Typography sx={{ fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontSize: 12.5, color: PALETTE.shellHeading }}>
                        #{trip.trip_id.slice(0, 8)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                        {shortDateTime(trip.created_at)}{trip.booked_via ? ` · ${trip.booked_via}` : ''}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0 }}>
                        <InitialsAvatar name={trip.customer_name} />
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>{trip.customer_name || '—'}</Typography>
                          <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                            {trip.customer_phone}{account && account !== trip.customer_name ? ` · ${account}` : ''}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell><RouteCell pickup={trip.pickup_address} dropoff={trip.dropoff_address} /></TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{pickupLabel(trip.pickup_time) || '—'}</TableCell>
                    <TableCell><TripStatusChip status={trip.status} /></TableCell>
                    <TableCell>
                      {canDispatch ? (
                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }} onClick={e => e.stopPropagation()}>
                          <FormControl size="small" sx={{ flex: 1, minWidth: 0 }}>
                            <Select
                              value={driverPhone}
                              onChange={e => setSelected(prev => ({ ...prev, [trip.trip_id]: e.target.value }))}
                              displayEmpty
                              sx={{ fontSize: 13 }}
                            >
                              <MenuItem value=""><em>{c.common.selectDriver}</em></MenuItem>
                              {onlineDrivers.map(d => (
                                <MenuItem key={d.phone} value={d.phone}>{d.name} · {d.phone}</MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                          <Tooltip title={c.common.dispatch}>
                            <span>
                              <IconButton
                                size="small"
                                aria-label={c.common.dispatch}
                                disabled={!driverPhone || dispatching}
                                onClick={() => onDispatch({ trip_id: trip.trip_id, driver_phone: driverPhone })}
                                sx={{
                                  width: 36, height: 36, color: '#fff',
                                  backgroundImage: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                                  '&.Mui-disabled': { backgroundImage: 'none', bgcolor: PALETTE.shellElevated, color: PALETTE.shellMuted },
                                }}
                              >
                                <SendRoundedIcon sx={{ fontSize: 17 }} />
                              </IconButton>
                            </span>
                          </Tooltip>
                        </Box>
                      ) : trip.driver_phone ? (
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="body2" sx={{ fontWeight: 500 }} noWrap>{assigned?.name ?? trip.driver_phone}</Typography>
                          {assigned ? <Typography variant="caption" color="text.secondary">{trip.driver_phone}</Typography> : null}
                        </Box>
                      ) : (
                        <Typography variant="body2" color="text.secondary">—</Typography>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        component="div"
        count={rows.length}
        page={Math.min(page, Math.max(0, Math.ceil(rows.length / pageSize) - 1))}
        onPageChange={(_, p) => setPage(p)}
        rowsPerPage={pageSize}
        onRowsPerPageChange={e => { setPageSize(Number(e.target.value)); setPage(0) }}
        rowsPerPageOptions={PAGE_SIZES}
        labelRowsPerPage={c.common.rowsPerPage}
        labelDisplayedRows={({ from, to, count }) => c.common.pageRange(from, to, count)}
      />
    </Box>
  )
}
