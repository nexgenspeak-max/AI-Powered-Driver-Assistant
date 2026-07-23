import { Box, Stack, Typography } from '@mui/material'
import type { Trip } from '../../../types'
import TripCard from './TripCard'

export default function TripSection({ title, trips }: { title: string; trips: Trip[] }) {
  if (trips.length === 0) return null

  return (
    <Box>
      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600,
        textTransform: 'uppercase', letterSpacing: 1, px: 0.5 }}>
        {title}
      </Typography>
      <Stack spacing={1.5} sx={{ mt: 1 }}>
        {trips.map(t => <TripCard key={t.trip_id} trip={t} />)}
      </Stack>
    </Box>
  )
}
