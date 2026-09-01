import { Box, Button, CardContent, Stack, Typography } from '@mui/material'
import { Link } from 'react-router-dom'
import SurfaceCard from '../../../components/SurfaceCard'
import { useTripNotificationStore } from '../../../stores/tripNotificationStore'
import { PALETTE } from '../../../styles/palette'

const COPY = {
  trip_confirmed: { title: 'Tài xế đã nhận chuyến!', tone: PALETTE.success },
  trip_rejected: { title: 'Tài xế từ chối chuyến', tone: PALETTE.danger },
} as const

export default function TripNotificationBanner() {
  const notification = useTripNotificationStore(s => s.notification)
  const dismiss = useTripNotificationStore(s => s.dismiss)

  if (!notification) return null
  const copy = COPY[notification.event]

  return (
    <Box sx={{ position: 'fixed', top: { xs: 64, md: 16 }, left: '50%', transform: 'translateX(-50%)', zIndex: 1300, width: { xs: 'calc(100% - 32px)', sm: 420 } }}>
      <SurfaceCard sx={{ borderLeft: `4px solid ${copy.tone}`, boxShadow: 3 }}>
        <CardContent sx={{ py: 1.5, px: 2 }}>
          <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>{copy.title}</Typography>
            <Stack direction="row" spacing={1}>
              <Button component={Link} to={`/trip/${notification.tripId}`} size="small" onClick={dismiss}>Xem</Button>
              <Button size="small" onClick={dismiss}>Đóng</Button>
            </Stack>
          </Stack>
        </CardContent>
      </SurfaceCard>
    </Box>
  )
}
