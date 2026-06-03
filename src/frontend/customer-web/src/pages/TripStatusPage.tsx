import { useParams, useNavigate } from 'react-router-dom'
import { Box, Button, Card, CardContent, Chip, CircularProgress, Divider, Stack, Typography } from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { useTripStatus } from '../features/trips/hooks/useTripStatus'
import { useBookingStore } from '../stores/bookingStore'
import type { TripStatus } from '../types'

const STATUS_COLOR: Record<TripStatus, 'default' | 'warning' | 'info' | 'success' | 'error'> = {
  pending:   'warning',
  notified:  'info',
  calling:   'info',
  confirmed: 'success',
  completed: 'success',
  rejected:  'error',
  no_answer: 'error',
}

const STATUS_LABEL: Record<TripStatus, string> = {
  pending:   'Waiting for driver...',
  notified:  'Notifying driver...',
  calling:   'Calling driver...',
  confirmed: 'Driver confirmed!',
  completed: 'Trip completed',
  rejected:  'No driver available',
  no_answer: 'Driver did not answer',
}

export default function TripStatusPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const setActiveTripId = useBookingStore(s => s.setActiveTripId)
  const { data: trip, isLoading } = useTripStatus(id ?? null)

  const handleNewTrip = () => {
    setActiveTripId(null)
    navigate('/')
  }

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100dvh', bgcolor: '#1a1f36' }}>
        <CircularProgress sx={{ color: '#6c8aff' }} />
      </Box>
    )
  }

  if (!trip) {
    return (
      <Box sx={{ p: 3, textAlign: 'center', mt: 10 }}>
        <Typography>Trip not found.</Typography>
        <Button onClick={() => navigate('/')} sx={{ mt: 2 }}>Go back</Button>
      </Box>
    )
  }

  const isDone = trip.status === 'completed' || trip.status === 'rejected' || trip.status === 'no_answer'

  return (
    <Box sx={{ minHeight: '100dvh', bgcolor: '#1a1f36', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ px: 3, pt: 6, pb: 3 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/')} sx={{ color: 'grey.400', mb: 1, pl: 0 }}>
          Back
        </Button>
        <Typography variant="h5" fontWeight={700} color="white">Trip Status</Typography>
        <Typography variant="body2" color="grey.400">#{trip.trip_id.slice(0, 8)}</Typography>
      </Box>

      <Box sx={{ flex: 1, bgcolor: '#f0f2f8', borderRadius: '24px 24px 0 0', p: 3 }}>
        {/* Status card */}
        <Card sx={{ borderRadius: 3, mb: 2, border: '1px solid #e8eaf0', textAlign: 'center', py: 1 }}>
          <CardContent>
            <Chip label={trip.status.toUpperCase()} color={STATUS_COLOR[trip.status]} sx={{ mb: 1.5, fontWeight: 700 }} />
            <Typography variant="h6" fontWeight={600}>{STATUS_LABEL[trip.status]}</Typography>
            {!isDone && <CircularProgress size={18} sx={{ mt: 1.5, color: '#6c8aff' }} />}
          </CardContent>
        </Card>

        {/* Trip details */}
        <Card sx={{ borderRadius: 3, border: '1px solid #e8eaf0' }}>
          <CardContent>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>Trip Details</Typography>
            <Stack spacing={1.5} divider={<Divider />}>
              <InfoRow label="From" value={trip.pickup_address} />
              <InfoRow label="To" value={trip.dropoff_address} />
              {trip.driver_phone && <InfoRow label="Driver" value={trip.driver_phone} />}
              {trip.eta_minutes > 0 && <InfoRow label="ETA" value={`${trip.eta_minutes} min`} />}
              {trip.distance_km > 0 && <InfoRow label="Distance" value={`${trip.distance_km} km`} />}
              {trip.traffic_note && <InfoRow label="Traffic" value={trip.traffic_note} />}
            </Stack>
          </CardContent>
        </Card>

        {isDone && (
          <Button fullWidth variant="contained" size="large" onClick={handleNewTrip}
            sx={{ mt: 3, py: 1.5, fontSize: 16, borderRadius: 2 }}>
            Book Another Ride
          </Button>
        )}
      </Box>
    </Box>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1}>
      <Typography variant="body2" color="text.secondary" sx={{ minWidth: 70 }}>{label}</Typography>
      <Typography variant="body2" fontWeight={500} textAlign="right">{value}</Typography>
    </Stack>
  )
}
