import { Box } from '@mui/material'
import { TripStatCards } from '../features/trips/components/TripStatCards'
import { TripTable } from '../features/trips/components/TripTable'
import { SettingsPanel } from '../layouts/SettingsPanel'
import { useTrips } from '../features/trips/hooks/useTrips'
import { useDispatchTrip } from '../features/trips/hooks/useDispatchTrip'
import { useDrivers } from '../features/drivers/hooks/useDrivers'
import { useCustomers } from '../features/customers/hooks/useCustomers'
import { useUiStore } from '../stores/uiStore'
import { normalizeTripStatus } from '../constants/status'

export default function TripBoardPage() {
  const filter      = useUiStore(s => s.tripStatusFilter)
  const setFilter   = useUiStore(s => s.setTripStatusFilter)
  // Always fetch the full, unfiltered trip list so the stat cards keep showing
  // totals; the status chips only filter what the table renders below.
  const { data: allTrips = [], isLoading: tripsLoading } = useTrips()
  const { data: drivers  = [] }                          = useDrivers()
  const { data: customers = [] }                         = useCustomers()
  const { mutate: dispatch, isPending: dispatching }     = useDispatchTrip()

  const trips = filter
    ? allTrips.filter(t => normalizeTripStatus(t.status) === filter)
    : allTrips

  return (
    <Box>
      <TripStatCards trips={allTrips} drivers={drivers} />
      <SettingsPanel sx={{ borderRadius: 2 }}>
        <TripTable
          trips={trips}
          drivers={drivers}
          customers={customers}
          loading={tripsLoading}
          statusFilter={filter}
          onStatusFilter={setFilter}
          onDispatch={dispatch}
          dispatching={dispatching}
        />
      </SettingsPanel>
    </Box>
  )
}
