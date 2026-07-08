import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Box, Button, Card, CardContent, CircularProgress, Container, Stack, TextField, Typography } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { useBookTrip } from '../features/trips/hooks/useBookTrip'
import { useBookingStore } from '../stores/bookingStore'
import HeaderComponent from '../features/home/components/HeaderComponent'
import { PALETTE } from '../styles/palette'

const schema = z.object({
  customer_name:   z.string().min(2, 'Name required'),
  customer_phone:  z.string().min(8, 'Valid phone required'),
  pickup_address:  z.string().min(5, 'Pickup address required'),
  dropoff_address: z.string().min(5, 'Dropoff address required'),
})
type FormValues = z.infer<typeof schema>

export default function BookingPage() {
  const navigate = useNavigate()
  const activeTripId = useBookingStore(s => s.activeTripId)
  const { mutate: book, isPending, isError, error } = useBookTrip()

  const { control, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { customer_name: '', customer_phone: '', pickup_address: '', dropoff_address: '' },
  })

  const onSubmit = (data: FormValues) => {
    book(data, { onSuccess: trip => navigate(`/trip/${trip.trip_id}`) })
  }

  return (
    <Box sx={{ minHeight: '100dvh', bgcolor: PALETTE.pale, display: 'flex', flexDirection: 'column' }}>
      <HeaderComponent />

      <Container maxWidth="sm" sx={{ py: { xs: 4, sm: 6 } }}>
        <Typography variant="h5" sx={{ fontWeight: 800, color: PALETTE.ink, mb: 0.5 }}>
          Book a Ride
        </Typography>
        <Typography variant="body2" sx={{ color: PALETTE.gray, mb: 3 }}>
          Enter your trip details below
        </Typography>

        {activeTripId && (
          <Card sx={{ mb: 2, bgcolor: '#e8f5e9', border: '1px solid #4ade80' }}>
            <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Typography variant="body2" color="success.dark">
                You have an active trip.{' '}
                <Box component="span" sx={{ textDecoration: 'underline', cursor: 'pointer' }}
                  onClick={() => navigate(`/trip/${activeTripId}`)}>
                  View status →
                </Box>
              </Typography>
            </CardContent>
          </Card>
        )}

        <Card sx={{ borderRadius: 3, border: '1px solid #e8eaf0' }}>
          <CardContent>
            <Stack component="form" onSubmit={handleSubmit(onSubmit)} spacing={2.5}>
              <Controller name="customer_name" control={control} render={({ field }) => (
                <TextField {...field} label="Your name" error={!!errors.customer_name}
                  helperText={errors.customer_name?.message} />
              )} />
              <Controller name="customer_phone" control={control} render={({ field }) => (
                <TextField {...field} label="Phone number" type="tel" error={!!errors.customer_phone}
                  helperText={errors.customer_phone?.message} />
              )} />
              <Controller name="pickup_address" control={control} render={({ field }) => (
                <TextField {...field} label="Pickup address" error={!!errors.pickup_address}
                  helperText={errors.pickup_address?.message} />
              )} />
              <Controller name="dropoff_address" control={control} render={({ field }) => (
                <TextField {...field} label="Dropoff address" error={!!errors.dropoff_address}
                  helperText={errors.dropoff_address?.message} />
              )} />

              {isError && (
                <Typography variant="body2" color="error">
                  {(error as any)?.response?.data?.detail ?? 'Failed to book. Please try again.'}
                </Typography>
              )}

              <Button type="submit" variant="contained" size="large" disabled={isPending}
                sx={{ py: 1.5, fontSize: 16, borderRadius: 2 }}>
                {isPending ? <CircularProgress size={22} color="inherit" /> : 'Book Now'}
              </Button>
            </Stack>
          </CardContent>
        </Card>
      </Container>
    </Box>
  )
}
