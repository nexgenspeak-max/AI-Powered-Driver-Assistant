import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Box, Button, Card, CardContent, CircularProgress, IconButton, InputAdornment, MenuItem, Stack, TextField, Typography } from '@mui/material'
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar'
import Visibility from '@mui/icons-material/Visibility'
import VisibilityOff from '@mui/icons-material/VisibilityOff'
import { useState } from 'react'
import { useDriverRegister } from '../features/auth/hooks/useDriverRegister'
import { Link } from 'react-router'
import { PALETTE } from '../styles/palette'

const fieldSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: '14px',
    backgroundColor: '#faf9fc',
    '& fieldset': { borderColor: '#e6e1ee' },
    '&:hover fieldset': { borderColor: PALETTE.light },
    '&.Mui-focused fieldset': { borderColor: PALETTE.base, borderWidth: '1.5px' },
  },
}

const VEHICLE_TYPES = ['Xe máy', 'Ô tô 4 chỗ', 'Ô tô 7 chỗ', 'Xe tải'] as const

const schema = z.object({
  name:          z.string().min(2, 'Name required'),
  phone:         z.string().min(8, 'Valid phone required'),
  email:         z.string().email('Valid email required'),
  password:      z.string().min(6, 'Password must be at least 6 characters'),
  vehicle_type:  z.string().min(1, 'Vehicle type required'),
  vehicle_plate: z.string().min(4, 'Valid license plate required'),
  vehicle_name:  z.string().min(2, 'Vehicle name required'),
})
type FormValues = z.infer<typeof schema>

export default function RegisterPage() {
  const { mutate: register, isPending, isError, error } = useDriverRegister()
  const [showPassword, setShowPassword] = useState(false)

  const { control, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', phone: '', email: '', password: '', vehicle_type: '', vehicle_plate: '', vehicle_name: '' },
  })

  const onSubmit = (data: FormValues) => register(data)

  return (
    <Box sx={{
      minHeight: '100dvh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', p: 3, position: 'relative', overflow: 'hidden',
      background: `linear-gradient(150deg, ${PALETTE.darkest} 0%, ${PALETTE.base} 55%, ${PALETTE.mid} 100%)`,
    }}>
      <Box sx={{ position: 'absolute', width: 320, height: 320, borderRadius: '50%', top: -120, left: -100,
        background: `radial-gradient(circle, ${PALETTE.mid}66 0%, transparent 70%)`, filter: 'blur(10px)' }} />
      <Box sx={{ position: 'absolute', width: 280, height: 280, borderRadius: '50%', bottom: -100, right: -80,
        background: `radial-gradient(circle, ${PALETTE.light}55 0%, transparent 70%)`, filter: 'blur(10px)' }} />

      <Box sx={{ textAlign: 'center', mb: 3.5, position: 'relative', zIndex: 1 }}>
        <Box sx={{ width: 76, height: 76, borderRadius: '22px', mx: 'auto', mb: 2.5,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: `linear-gradient(135deg, ${PALETTE.light} 0%, ${PALETTE.base} 100%)`,
          boxShadow: `0 12px 28px -8px ${PALETTE.base}aa` }}>
          <DirectionsCarIcon sx={{ color: 'white', fontSize: 38 }} />
        </Box>
        <Typography variant="h4" sx={{ fontWeight: 800, color: 'white', letterSpacing: '-0.02em' }}>
          Driver Sign Up
        </Typography>
        <Typography variant="body2" sx={{ color: PALETTE.light, mt: 0.75 }}>
          Register your vehicle to start receiving trips
        </Typography>
      </Box>

      <Card sx={{
        borderRadius: '28px', width: '100%', maxWidth: 400, position: 'relative', zIndex: 1,
        boxShadow: `0 24px 60px -20px ${PALETTE.darkest}aa`,
      }}>
        <CardContent sx={{ p: 4 }}>
          <Stack component="form" onSubmit={handleSubmit(onSubmit)} spacing={2.5}>
            <Controller name="name" control={control} render={({ field }) => (
              <TextField {...field} label="Your name" autoCapitalize="words" sx={fieldSx}
                error={!!errors.name} helperText={errors.name?.message} />
            )} />
            <Controller name="phone" control={control} render={({ field }) => (
              <TextField {...field} label="Phone number" type="tel" sx={fieldSx}
                placeholder="+84901234567"
                error={!!errors.phone} helperText={errors.phone?.message} />
            )} />
            <Controller name="email" control={control} render={({ field }) => (
              <TextField {...field} label="Email" type="email" sx={fieldSx}
                placeholder="you@example.com"
                error={!!errors.email} helperText={errors.email?.message} />
            )} />
            <Controller name="password" control={control} render={({ field }) => (
              <TextField {...field} label="Password" type={showPassword ? 'text' : 'password'} sx={fieldSx}
                error={!!errors.password} helperText={errors.password?.message}
                slotProps={{
                  input: {
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setShowPassword(v => !v)} edge="end" size="small">
                          {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  },
                }} />
            )} />
            <Controller name="vehicle_type" control={control} render={({ field }) => (
              <TextField {...field} select label="Vehicle type" sx={fieldSx}
                error={!!errors.vehicle_type} helperText={errors.vehicle_type?.message}>
                {VEHICLE_TYPES.map(type => (
                  <MenuItem key={type} value={type}>{type}</MenuItem>
                ))}
              </TextField>
            )} />
            <Controller name="vehicle_name" control={control} render={({ field }) => (
              <TextField {...field} label="Vehicle name" sx={fieldSx}
                placeholder="Honda Wave, Toyota Vios..."
                error={!!errors.vehicle_name} helperText={errors.vehicle_name?.message} />
            )} />
            <Controller name="vehicle_plate" control={control} render={({ field }) => (
              <TextField {...field} label="License plate" sx={fieldSx}
                placeholder="59-X1 123.45"
                error={!!errors.vehicle_plate} helperText={errors.vehicle_plate?.message} />
            )} />

            {isError && (
              <Typography variant="body2" color="error">
                {(error as any)?.response?.data?.detail ?? 'Registration failed. Check your details.'}
              </Typography>
            )}

            <Button type="submit" variant="contained" size="large" disabled={isPending}
              sx={{
                py: 1.5, fontSize: 16, fontWeight: 700, borderRadius: '14px', textTransform: 'none',
                background: `linear-gradient(135deg, ${PALETTE.base} 0%, ${PALETTE.mid} 100%)`,
                boxShadow: `0 10px 24px -10px ${PALETTE.base}cc`,
                '&:hover': { background: `linear-gradient(135deg, ${PALETTE.darkest} 0%, ${PALETTE.base} 100%)` },
              }}>
              {isPending ? <CircularProgress size={22} color="inherit" /> : 'Create Account'}
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <Typography variant="body2" sx={{ color: PALETTE.light, mt: 3, position: 'relative', zIndex: 1 }}>
        Already have an account?{' '}
        <Link to="/login" style={{ textDecoration: 'underline', color: '#fff', fontWeight: 600 }}>
          Log in here
        </Link>
      </Typography>
    </Box>
  )
}
