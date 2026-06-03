import { useNavigate } from 'react-router-dom'
import {
  Box, Card, CardContent, Typography, TextField, MenuItem,
  Button, Stack, Alert, CircularProgress,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import SendIcon from '@mui/icons-material/Send'
import { useState } from 'react'
import { useCreateTrip } from '../features/trips/hooks/useCreateTrip'
import { useDrivers } from '../features/drivers/hooks/useDrivers'
import { ROUTES } from '../constants'

export default function CreateTripPage() {
  const navigate = useNavigate()
  const { data: drivers = [] } = useDrivers()
  const { mutate: createTrip, isPending, error } = useCreateTrip()

  const [form, setForm] = useState({
    driver_phone:    '',
    customer_name:   '',
    customer_phone:  '',
    pickup_address:  '',
    dropoff_address: '',
    pickup_time:     '',
  })

  const set = (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createTrip({ ...form, booked_via: 'admin' }, {
      onSuccess: () => navigate(ROUTES.TRIP_BOARD),
    })
  }

  const errorMsg = error
    ? (error as any).response?.data?.detail ?? 'Failed to create trip'
    : null

  return (
    <Box sx={{ maxWidth: 640, mx: 'auto' }}>
      <Card elevation={0} sx={{ border: '1px solid #e8eaf0', borderRadius: 3 }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 3 }}>New Trip</Typography>

          <Box component="form" onSubmit={handleSubmit}>
            <Stack spacing={2.5}>
              <TextField select label="Driver" value={form.driver_phone} onChange={set('driver_phone')} required fullWidth size="small">
                <MenuItem value=""><em>Select driver...</em></MenuItem>
                {drivers.map((d: import('../types').Driver) => (
                  <MenuItem key={d.phone} value={d.phone}>
                    {d.name} — {d.phone} {d.status === 'online' ? '🟢' : '⚫'}
                  </MenuItem>
                ))}
              </TextField>

              <Stack direction="row" spacing={2}>
                <TextField label="Customer name"  value={form.customer_name}  onChange={set('customer_name')}  placeholder="Nguyễn Văn A"   required fullWidth size="small" />
                <TextField label="Customer phone" value={form.customer_phone} onChange={set('customer_phone')} placeholder="+84901234567"   fullWidth size="small" />
              </Stack>

              <TextField label="Pickup address"  value={form.pickup_address}  onChange={set('pickup_address')}  placeholder="123 Lê Lợi, Quận 1" required fullWidth size="small" />
              <TextField label="Dropoff address" value={form.dropoff_address} onChange={set('dropoff_address')} placeholder="45 Nguyễn Huệ, Quận 1" required fullWidth size="small" />
              <TextField label="Pickup time"     value={form.pickup_time}     onChange={set('pickup_time')}     placeholder="14:30"  fullWidth size="small" />

              {errorMsg && <Alert severity="error">{errorMsg}</Alert>}

              <Stack direction="row" spacing={1.5} sx={{ pt: 1 }}>
                <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => navigate(ROUTES.TRIP_BOARD)} fullWidth sx={{ borderRadius: 2 }}>
                  Cancel
                </Button>
                <Button type="submit" variant="contained" disabled={isPending}
                  endIcon={isPending ? <CircularProgress size={16} color="inherit" /> : <SendIcon />}
                  fullWidth sx={{ borderRadius: 2, bgcolor: '#6c8aff', '&:hover': { bgcolor: '#5a76f0' } }}
                >
                  {isPending ? 'Creating...' : 'Create & Notify Driver'}
                </Button>
              </Stack>
            </Stack>
          </Box>
        </CardContent>
      </Card>
    </Box>
  )
}
