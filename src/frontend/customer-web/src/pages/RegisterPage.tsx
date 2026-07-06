import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Box, Button, Card, CardContent, CircularProgress, IconButton, InputAdornment, Link as MuiLink, Stack, TextField, Typography } from '@mui/material'
import PersonAddIcon from '@mui/icons-material/PersonAddAlt1'
import Visibility from '@mui/icons-material/Visibility'
import VisibilityOff from '@mui/icons-material/VisibilityOff'
import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { authService } from '../services/api/auth'
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

const schema = z.object({
  name:     z.string().min(2, 'Name must be at least 2 characters'),
  phone:    z.string().min(8, 'Valid phone required'),
  email:    z.string().email('Valid email required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})
type FormValues = z.infer<typeof schema>

export default function RegisterPage() {
  const navigate = useNavigate()
  const setCustomer = useAuthStore(s => s.setCustomer)
  const setTokens = useAuthStore(s => s.setTokens)
  const [showPassword, setShowPassword] = useState(false)

  const { control, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', phone: '', email: '', password: '' },
  })

  const { mutate: register, isPending, isError } = useMutation({
    mutationFn: (data: FormValues) => authService.register({ role: 'customer', ...data }),
    onSuccess: ({ access_token, refresh_token, user }) => {
      setTokens(access_token, refresh_token)
      setCustomer({
        id: user.id,
        name: user.name,
        phone: user.phone ?? '',
        status: user.status === 'locked' ? 'offline' : user.status,
        created_at: user.created_at,
        updated_at: user.updated_at,
      })
      navigate('/')
    },
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
          <PersonAddIcon sx={{ color: 'white', fontSize: 38 }} />
        </Box>
        <Typography variant="h4" sx={{ fontWeight: 800, color: 'white', letterSpacing: '-0.02em' }}>
          Create account
        </Typography>
        <Typography variant="body2" sx={{ color: PALETTE.light, mt: 0.75 }}>
          Sign up to book your first ride
        </Typography>
      </Box>

      <Card sx={{
        borderRadius: '28px', width: '100%', maxWidth: 400, position: 'relative', zIndex: 1,
        boxShadow: `0 24px 60px -20px ${PALETTE.darkest}aa`,
      }}>
        <CardContent sx={{ p: 4 }}>
          <Stack component="form" onSubmit={handleSubmit(onSubmit)} spacing={2.5}>
            <Controller name="name" control={control} render={({ field }) => (
              <TextField {...field} label="Full name" sx={fieldSx}
                placeholder="Nguyễn Văn A"
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

            {isError && (
              <Typography variant="body2" color="error">
                Registration failed. Check your details.
              </Typography>
            )}

            <Button type="submit" variant="contained" size="large" disabled={isPending}
              sx={{
                py: 1.5, fontSize: 16, fontWeight: 700, borderRadius: '14px', textTransform: 'none',
                background: `linear-gradient(135deg, ${PALETTE.base} 0%, ${PALETTE.mid} 100%)`,
                boxShadow: `0 10px 24px -10px ${PALETTE.base}cc`,
                '&:hover': { background: `linear-gradient(135deg, ${PALETTE.darkest} 0%, ${PALETTE.base} 100%)` },
              }}>
              {isPending ? <CircularProgress size={22} color="inherit" /> : 'Sign Up'}
            </Button>

            <Typography variant="body2" sx={{ textAlign: 'center', color: PALETTE.gray }}>
              Already have an account?{' '}
              <MuiLink component={Link} to="/login" sx={{ color: PALETTE.base, fontWeight: 700 }}>
                Log in
              </MuiLink>
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  )
}
