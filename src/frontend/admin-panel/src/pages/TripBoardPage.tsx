import { Box, Card } from '@mui/material'
import { TripStatCards } from '../features/trips/components/TripStatCards'
import { TripTable } from '../features/trips/components/TripTable'
import { useTrips } from '../features/trips/hooks/useTrips'
import { useDispatchTrip } from '../features/trips/hooks/useDispatchTrip'
import { useDrivers } from '../features/drivers/hooks/useDrivers'
import { useUiStore } from '../stores/uiStore'

export default function TripBoardPage() {
  const filter      = useUiStore(s => s.tripStatusFilter)
  const setFilter   = useUiStore(s => s.setTripStatusFilter)
  const { data: trips   = [], isLoading: tripsLoading }   = useTrips(filter)
  const { data: drivers = [] }                            = useDrivers()
  const { mutate: dispatch, isPending: dispatching }      = useDispatchTrip()

  return (
    <Box>
      <TripStatCards trips={trips} drivers={drivers} />
      <Card elevation={0} sx={{ border: '1px solid #e8eaf0', borderRadius: 3 }}>
        <TripTable
          trips={trips}
          drivers={drivers}
          loading={tripsLoading}
          statusFilter={filter}
          onStatusFilter={setFilter}
          onDispatch={dispatch}
          dispatching={dispatching}
        />
      </Card>
    </Box>
  )
}
