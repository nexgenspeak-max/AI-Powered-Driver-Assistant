import { useState } from 'react'
import {
  Box,
  Button,
  CardContent,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Typography,
} from '@mui/material'
import PhoneIcon from '@mui/icons-material/Phone'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import Badge from '../../../components/Badge'
import RouteLine from '../../../components/RouteLine'
import SurfaceCard from '../../../components/SurfaceCard'
import DriverPicker from '../../booking/components/DriverPicker'
import { TRIP_STATUS_COLORS, TRIP_STATUS_LABELS } from '../../../constants/status'
import { tripsService } from '../../../services/api/trips'
import { primaryButtonSx } from '../../../styles/forms'
import { PALETTE } from '../../../styles/palette'
import type { Driver, Trip, TripStatus } from '../../../types'

const CUSTOMER_CANCELLABLE_STATUSES: TripStatus[] = [
  'pending',
  'notified',
  'calling',
  'confirmed',
  'arrived_pickup',
  'rejected',
  'no_answer',
]

export default function TripStatusCard({ trip }: { trip: Trip }) {
  const statusColor = TRIP_STATUS_COLORS[trip.status]
  const qc = useQueryClient()
  const [cancelOpen, setCancelOpen] = useState(false)
  const [reassignTo, setReassignTo] = useState<Driver | null>(null)

  const { mutate: cancelTrip, isPending: cancelling } = useMutation({
    mutationFn: () => tripsService.cancel(trip.trip_id),
    onSuccess: () => {
      setCancelOpen(false)
      qc.invalidateQueries({ queryKey: ['trip', trip.trip_id] })
      qc.invalidateQueries({ queryKey: ['trip-history'] })
    },
  })

  const { mutate: reassignDriver, isPending: reassigning } = useMutation({
    mutationFn: () => tripsService.reassignDriver(trip.trip_id, reassignTo!.phone),
    onSuccess: () => {
      setReassignTo(null)
      qc.invalidateQueries({ queryKey: ['trip', trip.trip_id] })
      qc.invalidateQueries({ queryKey: ['trip-history'] })
    },
  })

  const canCancel = CUSTOMER_CANCELLABLE_STATUSES.includes(trip.status)
  const isRejected = trip.status === 'rejected'

  return (
    <Stack spacing={2}>
      <SurfaceCard>
        <CardContent sx={{ p: { xs: 3, sm: 4 }, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box>
            <Badge
              label={TRIP_STATUS_LABELS[trip.status]}
              backgroundColor={statusColor.bg}
              color={statusColor.text}
            />
            <Typography variant="caption" sx={{ display: 'block', color: PALETTE.textMuted, mt: 1 }}>
              #{trip.trip_id}
            </Typography>
          </Box>

          <RouteLine pickup={trip.pickup_address} dropoff={trip.dropoff_address} />

          {trip.driver_phone ? (
            <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography variant="caption" sx={{ color: PALETTE.textMuted }}>Tài xế</Typography>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>{trip.driver_phone}</Typography>
              </Box>
              <IconButton
                component="a"
                href={`tel:${trip.driver_phone}`}
                aria-label="Gọi tài xế"
                sx={{ width: 44, height: 44, color: PALETTE.primary }}
              >
                <PhoneIcon />
              </IconButton>
            </Stack>
          ) : null}
        </CardContent>
      </SurfaceCard>

      {isRejected ? (
        <SurfaceCard>
          <CardContent sx={{ p: { xs: 3, sm: 4 }, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="body2">
              Tài xế đã từ chối chuyến này. Chọn tài xế khác để đặt lại.
            </Typography>
            <DriverPicker selected={reassignTo} onSelect={setReassignTo} />
            <Button
              variant="contained"
              size="large"
              onClick={() => reassignDriver()}
              disabled={!reassignTo || reassigning}
              sx={primaryButtonSx}
            >
              {reassigning ? <CircularProgress size={22} color="inherit" /> : 'Đặt lại chuyến'}
            </Button>
          </CardContent>
        </SurfaceCard>
      ) : null}

      {canCancel ? (
        <Button
          fullWidth
          variant="outlined"
          color="error"
          size="large"
          onClick={() => setCancelOpen(true)}
          disabled={cancelling}
          sx={{ minHeight: 52 }}
        >
          {cancelling ? <CircularProgress size={22} /> : 'Huỷ chuyến'}
        </Button>
      ) : null}

      <Dialog open={cancelOpen} onClose={() => !cancelling && setCancelOpen(false)}>
        <DialogTitle>Huỷ chuyến này?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Không thể hoàn tác — bạn sẽ cần đặt chuyến mới.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelOpen(false)} disabled={cancelling}>Giữ chuyến</Button>
          <Button color="error" onClick={() => cancelTrip()} disabled={cancelling}>
            {cancelling ? 'Đang huỷ...' : 'Huỷ chuyến'}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  )
}
