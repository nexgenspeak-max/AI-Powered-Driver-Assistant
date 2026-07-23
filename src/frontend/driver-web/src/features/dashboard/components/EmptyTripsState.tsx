import { Box, Typography } from '@mui/material'

export default function EmptyTripsState({ isOnline }: { isOnline: boolean }) {
  return (
    <Box sx={{ textAlign: 'center', py: 10 }}>
      <Typography sx={{ fontSize: 48, mb: 1 }}>✅</Typography>
      <Typography sx={{ fontWeight: 600, color: 'text.secondary' }}>
        {isOnline ? 'No trips right now' : 'You are offline'}
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.disabled', mt: 0.5 }}>
        {isOnline ? 'Auto-refreshing every 4s…' : 'Toggle online to receive trips'}
      </Typography>
    </Box>
  )
}
