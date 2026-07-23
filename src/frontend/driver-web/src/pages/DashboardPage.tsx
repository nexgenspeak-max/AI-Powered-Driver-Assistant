import { Box, Container } from '@mui/material'
import { useAuthStore } from '../stores/authStore'
import { useDriverTrips } from '../features/trips/hooks/useDriverTrips'
import HeaderComponent from '../features/home/components/HeaderComponent'
import TripSection from '../features/dashboard/components/TripSection'
import EmptyTripsState from '../features/dashboard/components/EmptyTripsState'
import { PALETTE } from '../styles/palette'

export default function DashboardPage() {
  const driver = useAuthStore(s => s.driver)!

  const { data: notified = [] } = useDriverTrips(driver.phone, 'notified')
  const { data: calling  = [] } = useDriverTrips(driver.phone, 'calling')
  const { data: active   = [] } = useDriverTrips(driver.phone, 'confirmed')

  const pending = [...notified, ...calling]
  const isOnline = driver.status === 'online'
  const hasBothSections = pending.length > 0 && active.length > 0

  return (
    <Box sx={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', bgcolor: PALETTE.pale }}>
      <HeaderComponent />

      <Container maxWidth="md" sx={{ flex: 1, py: { xs: 2, sm: 3 } }}>
        {pending.length === 0 && active.length === 0 ? (
          <EmptyTripsState isOnline={isOnline} />
        ) : (
          <Box sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: hasBothSections ? '1fr 1fr' : '1fr' },
            gap: 3, alignItems: 'start',
          }}>
            <TripSection title={`Trip Requests (${pending.length})`} trips={pending} />
            <TripSection title="Active Trip" trips={active} />
          </Box>
        )}
      </Container>
    </Box>
  )
}
