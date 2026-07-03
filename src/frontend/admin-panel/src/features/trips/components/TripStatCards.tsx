import { Card, CardContent, Stack, Typography } from '@mui/material'
import type { Trip } from '../../../types/trip'
import type { Driver } from '../../../types/driver'

type Props = {
  trips: Trip[]
  drivers: Driver[]
}

export function TripStatCards({ trips, drivers }: Props) {
  const pending   = trips.filter(t => t.status === 'pending').length
  const active    = trips.filter(t => ['notified', 'calling', 'confirmed'].includes(t.status)).length
  const completed = trips.filter(t => t.status === 'completed').length
  const online    = drivers.filter(d => d.status === 'online').length

  const stats = [
    { label: 'Pending',        value: pending,   color: '#f59e0b' },
    { label: 'Active',         value: active,    color: '#6c8aff' },
    { label: 'Completed',      value: completed, color: '#4ade80' },
    { label: 'Drivers Online', value: online,    color: '#22d3ee' },
  ]

  return (
    <Stack direction="row" spacing={2} sx={{ mb: 3, flexWrap: 'wrap' }}>
      {stats.map(s => (
        <Card key={s.label} elevation={0} sx={{ flex: 1, minWidth: 140, border: '1px solid #e8eaf0', borderRadius: 3 }}>
          <CardContent>
            <Typography variant="body2" color="text.secondary">{s.label}</Typography>
            <Typography variant="h4" sx={{ fontWeight: 700, color: s.color, mt: 0.5 }}>{s.value}</Typography>
          </CardContent>
        </Card>
      ))}
    </Stack>
  )
}
