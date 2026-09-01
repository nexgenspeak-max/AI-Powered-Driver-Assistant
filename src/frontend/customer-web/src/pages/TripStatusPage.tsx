import { useParams, useNavigate } from 'react-router-dom'
import { Box, Button, CircularProgress, IconButton, Stack, Typography } from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import AppShell from '../components/AppShell'
import PageHeader from '../components/PageHeader'
import SurfaceCard from '../components/SurfaceCard'
import TripStatusCard from '../features/trips/components/TripStatusCard'
import { useTripStatus } from '../features/trips/hooks/useTripStatus'
import { useBookingStore } from '../stores/bookingStore'
import { primaryButtonSx } from '../styles/forms'
import { PALETTE } from '../styles/palette'

export default function TripStatusPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const setActiveTripId = useBookingStore(s => s.setActiveTripId)
  const { data: trip, isLoading } = useTripStatus(id ?? null)

  const handleNewTrip = () => {
    setActiveTripId(null)
    navigate('/booking')
  }

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100dvh', bgcolor: PALETTE.background }}>
        <CircularProgress sx={{ color: PALETTE.primary }} />
      </Box>
    )
  }

  if (!trip) {
    return (
      <AppShell maxWidth="md">
        <SurfaceCard sx={{ textAlign: 'center', py: 4 }}>
          <Typography sx={{ fontWeight: 600 }}>Không tìm thấy chuyến đi.</Typography>
          <Button onClick={() => navigate('/')} sx={{ mt: 2 }}>Quay lại</Button>
        </SurfaceCard>
      </AppShell>
    )
  }

  const isDone = trip.status === 'completed' || trip.status === 'rejected' || trip.status === 'no_answer' || trip.status === 'cancelled'

  return (
    <AppShell maxWidth="md">
      <PageHeader
        title="Trạng thái chuyến"
        subtitle={`Mã chuyến #${trip.trip_id.slice(0, 8)}`}
        action={(
          <IconButton onClick={() => navigate(-1)} aria-label="Quay lại" sx={{ width: 44, height: 44 }}>
            <ArrowBackIcon />
          </IconButton>
        )}
      />

      <Stack spacing={3}>
        <TripStatusCard trip={trip} />

        {isDone ? (
          <Button fullWidth variant="contained" size="large" onClick={handleNewTrip} sx={primaryButtonSx}>
            Đặt chuyến mới
          </Button>
        ) : null}
      </Stack>
    </AppShell>
  )
}
