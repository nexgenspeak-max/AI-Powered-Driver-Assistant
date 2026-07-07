import { Button, Card, CardContent, Chip, CircularProgress, Divider, Stack, Typography } from '@mui/material'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { tripsService } from '../../../services/api/trips'
import type { Trip } from '../../../types'
import InfoRow from './InfoRow'

export default function TripCard({ trip }: { trip: Trip }) {
  const qc = useQueryClient()
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
