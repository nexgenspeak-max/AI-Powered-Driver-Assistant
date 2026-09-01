import { Button, CardContent, CircularProgress, Stack, Typography } from '@mui/material'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import Badge from '../../../components/Badge'
import RouteLine from '../../../components/RouteLine'
import SurfaceCard from '../../../components/SurfaceCard'
import { TRIP_STATUS_COLORS, TRIP_STATUS_LABELS } from '../../../constants/status'
import { tripsService } from '../../../services/api/trips'
import { PALETTE } from '../../../styles/palette'
import type { Trip } from '../../../types'

export default function TripCard({ trip }: { trip: Trip }) {
  const qc = useQueryClient()
  const statusColor = TRIP_STATUS_COLORS[trip.status]
  const avatarLetter = trip.customer_name?.trim().charAt(0).toUpperCase() || 'K'
  const showActions = trip.status === 'notified' || trip.status === 'calling'

  const { mutate: accept, isPending: accepting } = useMutation({
    mutationFn: () => tripsService.accept(trip.trip_id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['driverContext'] }),
  })
  const { mutate: reject, isPending: rejecting } = useMutation({
    mutationFn: () => tripsService.reject(trip.trip_id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['driverContext'] }),
  })

  return (
    <SurfaceCard>
      <CardContent sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
          <Stack
            sx={{
              alignItems: 'center',
              justifyContent: 'center',
              width: 44, height: 44, borderRadius: '50%',
              bgcolor: statusColor.bg, flexShrink: 0,
            }}
          >
            <Typography sx={{ fontWeight: 700, color: statusColor.text }}>{avatarLetter}</Typography>
          </Stack>
          <Stack sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="body1" sx={{ fontWeight: 700, color: PALETTE.textPrimary }} noWrap>
              {trip.customer_name}
            </Typography>
            <Typography variant="caption" sx={{ color: PALETTE.textSecondary }} noWrap>
              {trip.customer_phone}
              {trip.pickup_time ? ` · ${trip.pickup_time}` : ''}
            </Typography>
          </Stack>
          <Badge
            label={TRIP_STATUS_LABELS[trip.status]}
            backgroundColor={statusColor.bg}
            color={statusColor.text}
          />
        </Stack>

        <RouteLine pickup={trip.pickup_address} dropoff={trip.dropoff_address} />

        {showActions ? (
          <Stack direction="row" spacing={1.5}>
            <Button
              fullWidth variant="outlined" color="error"
              onClick={() => reject()}
              disabled={accepting || rejecting}
            >
              {rejecting ? <CircularProgress size={16} /> : 'Từ chối'}
            </Button>
            <Button
              fullWidth variant="contained"
              onClick={() => accept()}
              disabled={accepting || rejecting}
              sx={{ background: `linear-gradient(135deg, ${PALETTE.gradientStart}, ${PALETTE.gradientEnd})` }}
            >
              {accepting ? <CircularProgress size={16} color="inherit" /> : 'Nhận chuyến'}
            </Button>
          </Stack>
        ) : null}
      </CardContent>
    </SurfaceCard>
  )
}
