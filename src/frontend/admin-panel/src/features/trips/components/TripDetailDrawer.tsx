import { useState } from 'react'
import {
  Box, Button, Divider, Drawer, FormControl, IconButton, Link, MenuItem, Select, Stack, Typography,
} from '@mui/material'
import CloseRoundedIcon from '@mui/icons-material/CloseRounded'
import PhoneRoundedIcon from '@mui/icons-material/PhoneRounded'
import SendRoundedIcon from '@mui/icons-material/SendRounded'
import BlockRoundedIcon from '@mui/icons-material/BlockRounded'
import type { Driver, Trip } from '../../../types'
import { DISPATCHABLE_STATUSES, normalizeTripStatus } from '../../../constants/status'
import { useAdminContent } from '../../../i18n/useAdminContent'
import { PALETTE } from '../../../styles/palette'
import { InitialsAvatar } from '../../../components/StatusPill'
import { TripStatusChip } from './TripStatusChip'

const TERMINAL = ['completed', 'cancelled', 'cancelled_by_driver', 'no_show']

function dt(iso?: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 1.5, py: 0.75 }}>
      <Typography variant="body2" color="text.secondary">{label}</Typography>
      <Box sx={{ minWidth: 0 }}>{children}</Box>
    </Box>
  )
}

type Props = {
  trip: Trip | null
  drivers: Driver[]
  onClose: () => void
  onDispatch: (vars: { trip_id: string; driver_phone: string }) => void
  onCancel: (trip_id: string) => void
  busy: boolean
}

/** Everything about one trip plus the two actions a dispatcher needs: send to a driver, cancel. */
export function TripDetailDrawer({ trip, drivers, onClose, onDispatch, onCancel, busy }: Props) {
  const { c } = useAdminContent()
  const d = c.detail
  const [driverPhone, setDriverPhone] = useState('')
  if (!trip) return <Drawer anchor="right" open={false} onClose={onClose} />

  const status = normalizeTripStatus(trip.status)
  const canDispatch = DISPATCHABLE_STATUSES.includes(status)
  const canCancel = !TERMINAL.includes(status)
  const assigned = drivers.find(x => x.phone === trip.driver_phone)
  const online = drivers.filter(x => x.status === 'online')
  const extras = [trip.has_bulky_goods ? d.bulky : '', trip.with_children ? d.children : '', trip.note || ''].filter(Boolean).join(' · ')

  return (
    <Drawer
      anchor="right"
      open={!!trip}
      onClose={onClose}
      slotProps={{ paper: { sx: { width: { xs: '100%', sm: 440 }, bgcolor: PALETTE.shellPanel, borderLeft: `1px solid ${PALETTE.shellBorder}` } } }}
    >
      <Box sx={{ p: 2.5, display: 'flex', alignItems: 'flex-start', gap: 1.5, borderBottom: `1px solid ${PALETTE.shellBorder}` }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontSize: 13, color: 'text.secondary' }}>#{trip.trip_id.slice(0, 8)}</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
            <Typography variant="h6">{trip.customer_name || '—'}</Typography>
            <TripStatusChip status={trip.status} />
          </Box>
        </Box>
        <IconButton onClick={onClose} aria-label={d.close}><CloseRoundedIcon /></IconButton>
      </Box>

      <Box sx={{ p: 2.5, overflowY: 'auto', flex: 1 }}>
        <Typography sx={{ fontSize: 12, fontWeight: 700, color: PALETTE.light, textTransform: 'uppercase', letterSpacing: '0.06em', mb: 1 }}>{d.customer}</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
          <InitialsAvatar name={trip.customer_name} size={40} />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontWeight: 600 }}>{trip.customer_name || '—'}</Typography>
            <Typography variant="body2" color="text.secondary">{trip.customer_phone || '—'}</Typography>
          </Box>
          {trip.customer_phone ? (
            <IconButton component={Link} href={`tel:${trip.customer_phone}`} aria-label={trip.customer_phone} sx={{ bgcolor: `${PALETTE.success}1f`, color: PALETTE.success }}>
              <PhoneRoundedIcon fontSize="small" />
            </IconButton>
          ) : null}
        </Box>

        <Typography sx={{ fontSize: 12, fontWeight: 700, color: PALETTE.light, textTransform: 'uppercase', letterSpacing: '0.06em', mb: 1 }}>{d.route}</Typography>
        <Box sx={{ position: 'relative', pl: 3, mb: 1.5 }}>
          <Box sx={{ position: 'absolute', left: 7, top: 10, bottom: 10, width: 2, bgcolor: PALETTE.shellBorderStrong }} />
          {[[PALETTE.light, trip.pickup_address], [PALETTE.success, trip.dropoff_address]].map(([color, text], i) => (
            <Box key={i} sx={{ position: 'relative', py: 0.75 }}>
              <Box sx={{ position: 'absolute', left: -22, top: 12, width: 12, height: 12, borderRadius: '50%', bgcolor: color, boxShadow: `0 0 0 4px ${color}26` }} />
              <Typography variant="body2">{text || '—'}</Typography>
            </Box>
          ))}
        </Box>
        <Field label={d.pickupTime}><Typography variant="body2">{trip.pickup_time?.includes('T') ? dt(trip.pickup_time) : trip.pickup_time || '—'}</Typography></Field>
        <Field label={d.distance}><Typography variant="body2">{trip.distance_km ? `${trip.distance_km} km` : '—'}</Typography></Field>
        <Field label={d.eta}><Typography variant="body2">{trip.eta_minutes ? `${trip.eta_minutes} phút` : '—'}</Typography></Field>
        {trip.traffic_note ? <Field label={d.traffic}><Typography variant="body2">{trip.traffic_note}</Typography></Field> : null}
        {typeof trip.estimated_fare === 'number' ? (
          <Field label={d.fare}><Typography variant="body2" sx={{ fontWeight: 700 }}>{trip.estimated_fare.toLocaleString('vi-VN')} ₫</Typography></Field>
        ) : null}
        {extras ? <Field label={d.notes}><Typography variant="body2">{extras}</Typography></Field> : null}
        <Field label={d.bookedVia}><Typography variant="body2">{trip.booked_via || '—'}</Typography></Field>
        <Field label={d.created}><Typography variant="body2">{dt(trip.created_at)}</Typography></Field>
        <Field label={d.updated}><Typography variant="body2">{dt(trip.updated_at)}</Typography></Field>

        <Divider sx={{ my: 2 }} />
        <Typography sx={{ fontSize: 12, fontWeight: 700, color: PALETTE.light, textTransform: 'uppercase', letterSpacing: '0.06em', mb: 1 }}>{d.driver}</Typography>
        {trip.driver_phone ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
            <InitialsAvatar name={assigned?.name ?? trip.driver_phone} size={36} />
            <Box>
              <Typography sx={{ fontWeight: 600 }}>{assigned?.name ?? trip.driver_phone}</Typography>
              <Typography variant="body2" color="text.secondary">{trip.driver_phone}</Typography>
            </Box>
          </Box>
        ) : (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{d.noDriver}</Typography>
        )}
        {canDispatch ? (
          <Stack direction="row" spacing={1}>
            <FormControl size="small" sx={{ flex: 1 }}>
              <Select value={driverPhone} displayEmpty onChange={e => setDriverPhone(e.target.value)}>
                <MenuItem value=""><em>{c.common.selectDriver}</em></MenuItem>
                {online.map(x => <MenuItem key={x.phone} value={x.phone}>{x.name} · {x.phone}</MenuItem>)}
              </Select>
            </FormControl>
            <Button variant="contained" startIcon={<SendRoundedIcon />} disabled={!driverPhone || busy}
              onClick={() => onDispatch({ trip_id: trip.trip_id, driver_phone: driverPhone })}>
              {d.assign}
            </Button>
          </Stack>
        ) : null}
      </Box>

      {canCancel ? (
        <Box sx={{ p: 2.5, borderTop: `1px solid ${PALETTE.shellBorder}` }}>
          <Button fullWidth variant="outlined" color="error" startIcon={<BlockRoundedIcon />} disabled={busy}
            sx={{ color: PALETTE.danger, borderColor: `${PALETTE.danger}55` }}
            onClick={() => { if (window.confirm(d.confirmCancel)) onCancel(trip.trip_id) }}>
            {d.cancelTrip}
          </Button>
        </Box>
      ) : null}
    </Drawer>
  )
}
