import { useState } from 'react'
import { Alert, Button, CardContent, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography } from '@mui/material'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import Badge from '../../../components/Badge'
import RouteLine from '../../../components/RouteLine'
import SurfaceCard from '../../../components/SurfaceCard'
import TripProgressStepper from './TripProgressStepper'
import { TRIP_STATUS_COLORS, TRIP_STATUS_LABELS } from '../../../constants/status'
import { tripsService } from '../../../services/api/trips'
import { getCurrentCoords } from '../../../utils/currentLocation'
import { PALETTE } from '../../../styles/palette'
import type { TripWithFare } from '../../../types'

function arrivalErrorMessage(err: unknown): string {
  const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
  return detail || 'Không thể xác nhận, vui lòng thử lại.'
}

const NEXT_ACTION: Record<string, { label: string; variant: 'outlined' | 'contained' }> = {
  confirmed: { label: 'Đã đến điểm đón', variant: 'outlined' },
  arrived_pickup: { label: 'Đã đón khách', variant: 'outlined' },
  picked_up: { label: 'Hoàn thành chuyến', variant: 'contained' },
}

export default function ActiveTripCard({ trip }: { trip: TripWithFare }) {
  const qc = useQueryClient()
  const [error, setError] = useState<string | null>(null)
  const [cancelOpen, setCancelOpen] = useState(false)
  const invalidate = () => qc.invalidateQueries({ queryKey: ['driverContext'] })

  const onArrivalError = (err: unknown) => setError(arrivalErrorMessage(err))

  const { mutate: arrivedPickup, isPending: arriving } = useMutation({
    mutationFn: async () => {
      const { lat, lng } = await getCurrentCoords()
      return tripsService.arrivedPickup(trip.trip_id, lat, lng)
    },
    onSuccess: () => { setError(null); invalidate() },
    onError: onArrivalError,
  })
  const { mutate: pickedUp, isPending: pickingUp } = useMutation({
    mutationFn: async () => {
      const { lat, lng } = await getCurrentCoords()
      return tripsService.pickedUp(trip.trip_id, lat, lng)
    },
    onSuccess: () => { setError(null); invalidate() },
    onError: onArrivalError,
  })
  const { mutate: complete, isPending: completing } = useMutation({
    mutationFn: async () => {
      const { lat, lng } = await getCurrentCoords()
      return tripsService.complete(trip.trip_id, lat, lng)
    },
    onSuccess: () => { setError(null); invalidate() },
    onError: onArrivalError,
  })
  const { mutate: cancelTrip, isPending: cancelling } = useMutation({
    mutationFn: () => tripsService.cancel(trip.trip_id),
    onSuccess: () => { setCancelOpen(false); invalidate() },
  })

  const action = NEXT_ACTION[trip.status]
  const onAction =
    trip.status === 'confirmed' ? arrivedPickup
      : trip.status === 'arrived_pickup' ? pickedUp
        : complete
  const actionPending = arriving || pickingUp || completing
  const canCancel = trip.status !== 'picked_up' && trip.status !== 'completed'
  const statusColor = TRIP_STATUS_COLORS[trip.status]
  const avatarLetter = trip.customer_name?.trim().charAt(0).toUpperCase() || 'K'

  return (
    <>
      <SurfaceCard>
        <CardContent sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
            <Stack sx={{ alignItems: 'center', justifyContent: 'center', width: 44, height: 44, borderRadius: '50%', bgcolor: PALETTE.successContainer }}>
              <Typography sx={{ fontWeight: 700, color: PALETTE.success }}>{avatarLetter}</Typography>
            </Stack>
            <Stack sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="body1" sx={{ fontWeight: 700 }} noWrap>{trip.customer_name}</Typography>
              <Typography variant="caption" sx={{ color: PALETTE.textSecondary }} noWrap>{trip.customer_phone}</Typography>
            </Stack>
            <Badge label={TRIP_STATUS_LABELS[trip.status]} backgroundColor={statusColor.bg} color={statusColor.text} />
          </Stack>

          <TripProgressStepper status={trip.status} />
          <RouteLine pickup={trip.pickup_address} dropoff={trip.dropoff_address} />

          {trip.estimated_fare != null ? (
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              Ước tính: {trip.estimated_fare.toLocaleString('vi-VN')} ₫
            </Typography>
          ) : null}

          {error ? <Alert severity="error">{error}</Alert> : null}

          {action ? (
            <Button
              fullWidth
              variant={action.variant}
              onClick={() => onAction()}
              disabled={actionPending}
              sx={action.variant === 'contained' ? { background: `linear-gradient(135deg, ${PALETTE.gradientStart}, ${PALETTE.gradientEnd})` } : undefined}
            >
              {actionPending ? <CircularProgress size={18} /> : action.label}
            </Button>
          ) : null}

          {canCancel ? (
            <Button fullWidth color="error" variant="text" onClick={() => setCancelOpen(true)} disabled={cancelling}>
              Huỷ chuyến
            </Button>
          ) : null}
        </CardContent>
      </SurfaceCard>

      <Dialog open={cancelOpen} onClose={() => setCancelOpen(false)}>
        <DialogTitle>Huỷ chuyến này?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">Khách sẽ được thông báo. Thao tác này không thể hoàn tác.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelOpen(false)}>Giữ chuyến</Button>
          <Button color="error" onClick={() => cancelTrip()} disabled={cancelling}>Huỷ chuyến</Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
