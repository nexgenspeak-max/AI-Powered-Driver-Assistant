import { Box, Button, Card, CardContent, Chip, CircularProgress, Divider, Stack, Switch, Typography } from '@mui/material'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../stores/authStore'
import { driversService } from '../services/api/drivers'
import { tripsService } from '../services/api/trips'
import { useDriverTrips } from '../features/trips/hooks/useDriverTrips'
import type { Trip } from '../types'

export default function DashboardPage() {
  const driver    = useAuthStore(s => s.driver)!
  const setDriver = useAuthStore(s => s.setDriver)
  const logout    = useAuthStore(s => s.logout)
  const qc        = useQueryClient()

  const { data: notified = [] } = useDriverTrips(driver.phone, 'notified')
  const { data: calling  = [] } = useDriverTrips(driver.phone, 'calling')
  const { data: active   = [] } = useDriverTrips(driver.phone, 'confirmed')

  const pending = [...notified, ...calling]
  const isOnline = driver.status === 'online'

  const { mutate: toggleOnline } = useMutation({
    mutationFn: (online: boolean) =>
      driversService.update(driver.phone, { status: online ? 'online' : 'offline' }),
    onSuccess: d => { setDriver(d); qc.invalidateQueries({ queryKey: ['trips', 'driver'] }) },
  })

  return (
    <Box sx={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ bgcolor: '#1a1f36', px: 3, pt: 6, pb: 3 }}>
        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
          <Stack direction="row" sx={{ alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ width: 40, height: 40, bgcolor: '#6c8aff', borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Typography sx={{ fontWeight: 700, color: 'white' }}>{driver.name.charAt(0).toUpperCase()}</Typography>
            </Box>
            <Box>
              <Typography sx={{ fontWeight: 700, color: 'white' }}>{driver.name}</Typography>
              <Typography variant="caption" sx={{ color: 'grey.400' }}>{driver.phone}</Typography>
            </Box>
          </Stack>
          <Stack direction="row" sx={{ alignItems: 'center', gap: 1 }}>
            <Typography variant="caption" sx={{ color: isOnline ? '#4ade80' : 'grey.500', fontWeight: 600 }}>
              {isOnline ? 'Online' : 'Offline'}
            </Typography>
            <Switch checked={isOnline} onChange={e => toggleOnline(e.target.checked)}
              sx={{ '& .MuiSwitch-track': { bgcolor: isOnline ? '#166534' : undefined } }} />
          </Stack>
        </Stack>
      </Box>

      {/* Content */}
      <Box sx={{ flex: 1, bgcolor: '#f0f2f8', borderRadius: '24px 24px 0 0', p: 2 }}>
        <Stack spacing={2}>
          {pending.length > 0 && (
            <Box>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600,
                textTransform: 'uppercase', letterSpacing: 1, px: 0.5 }}>
                Trip Requests ({pending.length})
              </Typography>
              <Stack spacing={1.5} sx={{ mt: 1 }}>
                {pending.map(t => <TripCard key={t.trip_id} trip={t} qc={qc} />)}
              </Stack>
            </Box>
          )}

          {active.length > 0 && (
            <Box>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600,
                textTransform: 'uppercase', letterSpacing: 1, px: 0.5 }}>
                Active Trip
              </Typography>
              <Stack spacing={1.5} sx={{ mt: 1 }}>
                {active.map(t => <TripCard key={t.trip_id} trip={t} qc={qc} />)}
              </Stack>
            </Box>
          )}

          {pending.length === 0 && active.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 10 }}>
              <Typography sx={{ fontSize: 48, mb: 1 }}>✅</Typography>
              <Typography sx={{ fontWeight: 600, color: 'text.secondary' }}>
                {isOnline ? 'No trips right now' : 'You are offline'}
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.disabled', mt: 0.5 }}>
                {isOnline ? 'Auto-refreshing every 4s…' : 'Toggle online to receive trips'}
              </Typography>
            </Box>
          )}

          <Button onClick={logout} color="inherit" size="small" sx={{ color: 'text.disabled', mt: 'auto' }}>
            Logout
          </Button>
        </Stack>
      </Box>
    </Box>
  )
}

function TripCard({ trip, qc }: { trip: Trip; qc: ReturnType<typeof useQueryClient> }) {
  const isConfirmed = trip.status === 'confirmed'

  const { mutate: accept, isPending: accepting } = useMutation({
    mutationFn: () => tripsService.accept(trip.trip_id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['trips', 'driver'] }),
  })
  const { mutate: reject, isPending: rejecting } = useMutation({
    mutationFn: () => tripsService.reject(trip.trip_id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['trips', 'driver'] }),
  })
  const { mutate: complete, isPending: completing } = useMutation({
    mutationFn: () => tripsService.complete(trip.trip_id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['trips', 'driver'] }),
  })

  return (
    <Card sx={{ borderRadius: 3, border: '1px solid #e8eaf0' }}>
      <CardContent>
        <Stack spacing={1}>
          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{trip.customer_name}</Typography>
            <Chip label={trip.status} size="small" color={isConfirmed ? 'success' : 'warning'} />
          </Stack>

          <Stack spacing={0.5} divider={<Divider />}>
            <InfoRow label="From" value={trip.pickup_address} />
            <InfoRow label="To" value={trip.dropoff_address} />
            {trip.eta_minutes > 0 && <InfoRow label="ETA" value={`${trip.eta_minutes} min`} />}
            {trip.distance_km > 0 && <InfoRow label="Dist" value={`${trip.distance_km} km`} />}
          </Stack>

          <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
            {!isConfirmed ? (
              <>
                <Button fullWidth variant="contained" color="success" onClick={() => accept()}
                  disabled={accepting || rejecting} size="small">
                  {accepting ? <CircularProgress size={16} color="inherit" /> : 'Accept'}
                </Button>
                <Button fullWidth variant="outlined" color="error" onClick={() => reject()}
                  disabled={accepting || rejecting} size="small">
                  {rejecting ? <CircularProgress size={16} color="inherit" /> : 'Reject'}
                </Button>
              </>
            ) : (
              <Button fullWidth variant="contained" color="primary" onClick={() => complete()}
                disabled={completing} size="small">
                {completing ? <CircularProgress size={16} color="inherit" /> : 'Mark Completed'}
              </Button>
            )}
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <Stack direction="row" sx={{ justifyContent: 'space-between', gap: 1, py: 0.5 }}>
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>{label}</Typography>
      <Typography variant="caption" sx={{ fontWeight: 500, textAlign: 'right' }}>{value}</Typography>
    </Stack>
  )
}
