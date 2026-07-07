import { Box, Button, Stack } from '@mui/material'
import { useAuthStore } from '../stores/authStore'
import { useDriverTrips } from '../features/trips/hooks/useDriverTrips'
import DashboardHeader from '../features/dashboard/components/DashboardHeader'
import TripSection from '../features/dashboard/components/TripSection'
import EmptyTripsState from '../features/dashboard/components/EmptyTripsState'

export default function DashboardPage() {
  const driver = useAuthStore(s => s.driver)!
  const logout = useAuthStore(s => s.logout)

  const { data: notified = [] } = useDriverTrips(driver.phone, 'notified')
  const { data: calling  = [] } = useDriverTrips(driver.phone, 'calling')
  const { data: active   = [] } = useDriverTrips(driver.phone, 'confirmed')

  const pending = [...notified, ...calling]
  const isOnline = driver.status === 'online'

  return (
    <Box sx={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <DashboardHeader />

      <Box sx={{ flex: 1, bgcolor: '#f0f2f8', borderRadius: '24px 24px 0 0', p: 2 }}>
        <Stack spacing={2}>
          <TripSection title={`Trip Requests (${pending.length})`} trips={pending} />
          <TripSection title="Active Trip" trips={active} />

          {pending.length === 0 && active.length === 0 && (
            <EmptyTripsState isOnline={isOnline} />
          )}

          <Button onClick={logout} color="inherit" size="small" sx={{ color: 'text.disabled', mt: 'auto' }}>
            Logout
          </Button>
        </Stack>
      </Box>
    </Box>
  )
}
