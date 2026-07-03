import { Card, CardContent, Stack, Typography } from '@mui/material'
import type { Driver } from '../../../types'

type Props = { drivers: Driver[] }

export function DriverStatCards({ drivers }: Props) {
  const online  = drivers.filter(d => d.status === 'online').length
  const offline = drivers.length - online

  const stats = [
    { label: 'Total Drivers', value: drivers.length, color: '#6c8aff' },
    { label: 'Online',        value: online,          color: '#4ade80' },
    { label: 'Offline',       value: offline,         color: '#9ca3af' },
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
