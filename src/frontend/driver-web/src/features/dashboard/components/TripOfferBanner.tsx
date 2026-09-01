import { Box, Button, CardContent, CircularProgress, Stack, Typography } from '@mui/material'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import SurfaceCard from '../../../components/SurfaceCard'
import RouteLine from '../../../components/RouteLine'
import Badge from '../../../components/Badge'
import { useTripOfferStore } from '../../../stores/tripOfferStore'
import { tripsService } from '../../../services/api/trips'
import { TRIP_STATUS_COLORS, TRIP_STATUS_LABELS } from '../../../constants/status'
import { PALETTE } from '../../../styles/palette'

export default function TripOfferBanner() {
  const qc = useQueryClient()
  const tripId = useTripOfferStore(s => s.tripId)
  const dismiss = useTripOfferStore(s => s.dismiss)

  const { data: trip, isLoading } = useQuery({
    queryKey: ['trip-offer', tripId],
    queryFn: () => tripsService.get(tripId!),
    enabled: !!tripId,
  })

  const { mutate: accept, isPending: accepting } = useMutation({
    mutationFn: () => tripsService.accept(tripId!),
    onSuccess: () => {
      dismiss()
      qc.invalidateQueries({ queryKey: ['driverContext'] })
    },
  })
  const { mutate: reject, isPending: rejecting } = useMutation({
    mutationFn: () => tripsService.reject(tripId!),
    onSuccess: () => {
      dismiss()
      qc.invalidateQueries({ queryKey: ['driverContext'] })
    },
  })

  if (!tripId) return null

  const statusColor = trip ? TRIP_STATUS_COLORS[trip.status] : TRIP_STATUS_COLORS.notified

  return (
    <Box sx={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 1300, width: { xs: 'calc(100% - 32px)', sm: 420 } }}>
      <SurfaceCard sx={{ boxShadow: 4 }}>
        <CardContent sx={{ p: 2 }}>
          <Stack spacing={1.5}>
            <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Chuyến mới!</Typography>
              <Button size="small" onClick={dismiss}>Đóng</Button>
            </Stack>
            {isLoading || !trip ? (
              <CircularProgress size={24} sx={{ alignSelf: 'center' }} />
            ) : (
              <>
                <Badge label={TRIP_STATUS_LABELS[trip.status]} backgroundColor={statusColor.bg} color={statusColor.text} />
                <RouteLine pickup={trip.pickup_address} dropoff={trip.dropoff_address} />
                <Stack direction="row" spacing={1}>
                  <Button fullWidth variant="outlined" color="error" onClick={() => reject()} disabled={accepting || rejecting}>
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
                <Button component={Link} to="/dashboard" size="small" onClick={dismiss} sx={{ alignSelf: 'center' }}>
                  Xem trên bảng chuyến đi
                </Button>
              </>
            )}
          </Stack>
        </CardContent>
      </SurfaceCard>
    </Box>
  )
}
