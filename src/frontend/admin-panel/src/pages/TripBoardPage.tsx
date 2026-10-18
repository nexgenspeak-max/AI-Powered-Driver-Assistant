import { useState } from 'react'
import { Box, Snackbar, Typography } from '@mui/material'
import { TripStatCards } from '../features/trips/components/TripStatCards'
import { TripTable } from '../features/trips/components/TripTable'
import { TripDetailDrawer } from '../features/trips/components/TripDetailDrawer'
import { SettingsPanel } from '../layouts/SettingsPanel'
import { useTrips } from '../features/trips/hooks/useTrips'
import { useDispatchTrip } from '../features/trips/hooks/useDispatchTrip'
import { useCancelTrip } from '../features/trips/hooks/useCancelTrip'
import { useDrivers } from '../features/drivers/hooks/useDrivers'
import { useCustomers } from '../features/customers/hooks/useCustomers'
import { useUiStore } from '../stores/uiStore'
import { useAdminContent } from '../i18n/useAdminContent'
import { PALETTE } from '../styles/palette'

function LiveBadge({ at }: { at: number }) {
  const { c } = useAdminContent()
  if (!at) return null
  const time = new Date(at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  return (
    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, px: 1.25, py: 0.5, borderRadius: 999, border: `1px solid ${PALETTE.shellBorder}`, bgcolor: PALETTE.shellPanel }}>
      <Box sx={{
        width: 8, height: 8, borderRadius: '50%', bgcolor: PALETTE.success,
        '@keyframes pulse': { '0%': { boxShadow: `0 0 0 0 ${PALETTE.success}88` }, '100%': { boxShadow: `0 0 0 8px ${PALETTE.success}00` } },
        animation: 'pulse 1.6s ease-out infinite',
      }} />
      <Typography sx={{ fontSize: 12, color: 'text.secondary', fontVariantNumeric: 'tabular-nums' }}>{c.detail.live(time)}</Typography>
    </Box>
  )
}

export default function TripBoardPage() {
  const filter      = useUiStore(s => s.tripStatusFilter)
  const setFilter   = useUiStore(s => s.setTripStatusFilter)
  const { c } = useAdminContent()
  // Always fetch the full, unfiltered trip list so the stat cards keep showing
  // totals; the table applies the status filter and search itself.
  const { data: allTrips = [], isLoading: tripsLoading, dataUpdatedAt } = useTrips()
  const { data: drivers  = [] }                          = useDrivers()
  const { data: customers = [] }                         = useCustomers()
  const { mutate: dispatch, isPending: dispatching }     = useDispatchTrip()
  const { mutate: cancel, isPending: cancelling }        = useCancelTrip()
  const [openId, setOpenId] = useState<string | null>(null)
  const [toast, setToast] = useState('')
  const open = allTrips.find(t => t.trip_id === openId) ?? null

  const doDispatch = (vars: { trip_id: string; driver_phone: string }) =>
    dispatch(vars, {
      onSuccess: () => setToast(c.detail.dispatched(drivers.find(d => d.phone === vars.driver_phone)?.name ?? vars.driver_phone)),
      onError: () => setToast(c.detail.failed),
    })
  const doCancel = (trip_id: string) =>
    cancel(trip_id, { onSuccess: () => setToast(c.detail.cancelled), onError: () => setToast(c.detail.failed) })

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: -1, mb: 2 }}>
        <LiveBadge at={dataUpdatedAt} />
      </Box>
      <TripStatCards trips={allTrips} drivers={drivers} />
      <SettingsPanel sx={{ borderRadius: 2 }}>
        <TripTable
          trips={allTrips}
          drivers={drivers}
          customers={customers}
          loading={tripsLoading}
          statusFilter={filter}
          onStatusFilter={setFilter}
          onDispatch={doDispatch}
          dispatching={dispatching}
          onOpen={t => setOpenId(t.trip_id)}
        />
      </SettingsPanel>
      <TripDetailDrawer
        key={openId ?? 'none'}
        trip={open}
        drivers={drivers}
        onClose={() => setOpenId(null)}
        onDispatch={doDispatch}
        onCancel={doCancel}
        busy={dispatching || cancelling}
      />
      <Snackbar open={!!toast} autoHideDuration={3500} onClose={() => setToast('')} message={toast} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} />
    </Box>
  )
}
