import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Box, Button, Card, CardContent, CircularProgress, Stack, TextField, Typography } from '@mui/material'
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar'
import { useDriverLogin } from '../features/auth/hooks/useDriverLogin'

const schema = z.object({
  name:  z.string().min(2, 'Name required'),
  phone: z.string().min(8, 'Valid phone required'),
})
type FormValues = z.infer<typeof schema>

export default function LoginPage() {
  const { mutate: login, isPending, isError, error } = useDriverLogin()

  const { control, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', phone: '' },
  })

  const onSubmit = (data: FormValues) => login(data)

  return (
    <Box sx={{ minHeight: '100dvh', bgcolor: '#1a1f36', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ px: 3, pt: 8, pb: 4, textAlign: 'center' }}>
        <Box sx={{ width: 72, height: 72, bgcolor: '#6c8aff', borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2 }}>
          <DirectionsCarIcon sx={{ color: 'white', fontSize: 36 }} />
        </Box>
        <Typography variant="h5" sx={{ fontWeight: 700, color: 'white' }}>Driver Login</Typography>
        <Typography variant="body2" sx={{ color: 'grey.400', mt: 0.5 }}>
          Enter your details to start receiving trips
        </Typography>
      </Box>

      <Box sx={{ flex: 1, bgcolor: '#f0f2f8', borderRadius: '24px 24px 0 0', p: 3 }}>
        <Card sx={{ borderRadius: 3, border: '1px solid #e8eaf0' }}>
          <CardContent>
            <Stack component="form" onSubmit={handleSubmit(onSubmit)} spacing={2.5}>
              <Controller name="name" control={control} render={({ field }) => (
                <TextField {...field} label="Your name" autoCapitalize="words"
                  error={!!errors.name} helperText={errors.name?.message} />
              )} />
              <Controller name="phone" control={control} render={({ field }) => (
                <TextField {...field} label="Phone number" type="tel"
                  placeholder="+84901234567"
                  error={!!errors.phone} helperText={errors.phone?.message} />
              )} />

              {isError && (
                <Typography variant="body2" color="error">
                  {(error as any)?.response?.data?.detail ?? 'Login failed. Check your details.'}
                </Typography>
              )}

              <Button type="submit" variant="contained" size="large" disabled={isPending}
                sx={{ py: 1.5, fontSize: 16, borderRadius: 2 }}>
                {isPending ? <CircularProgress size={22} color="inherit" /> : 'Start Driving'}
              </Button>
            </Stack>
          </CardContent>
        </Card>
      </Box>
    </Box>
  )
}
