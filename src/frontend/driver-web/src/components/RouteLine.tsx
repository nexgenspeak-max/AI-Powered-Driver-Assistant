import { Box, Stack, Typography } from '@mui/material'
import { PALETTE } from '../styles/palette'

type RouteLineProps = {
  pickup: string
  dropoff: string
  pickupLabel?: string
  dropoffLabel?: string
}

export default function RouteLine({
  pickup,
  dropoff,
  pickupLabel = 'Điểm đón',
  dropoffLabel = 'Điểm đến',
}: RouteLineProps) {
  return (
    <Stack direction="row" spacing={1.5}>
      <Stack sx={{ alignItems: 'center', pt: 0.5 }}>
        <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: PALETTE.primary }} />
        <Box sx={{ width: 2, flex: 1, minHeight: 18, my: 0.5, bgcolor: PALETTE.borderStrong }} />
        <Box sx={{ width: 10, height: 10, borderRadius: '3px', bgcolor: PALETTE.success }} />
      </Stack>
      <Stack spacing={1.5} sx={{ flex: 1 }}>
        <Box>
          <Typography variant="caption" sx={{ color: PALETTE.textMuted }}>{pickupLabel}</Typography>
          <Typography variant="body1" sx={{ fontWeight: 600, color: PALETTE.textPrimary }}>{pickup}</Typography>
        </Box>
        <Box>
          <Typography variant="caption" sx={{ color: PALETTE.textMuted }}>{dropoffLabel}</Typography>
          <Typography variant="body1" sx={{ fontWeight: 600, color: PALETTE.textPrimary }}>{dropoff}</Typography>
        </Box>
      </Stack>
    </Stack>
  )
}
