import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button, CircularProgress, IconButton, InputAdornment, Link as MuiLink, Stack, TextField, Typography } from '@mui/material'
import Visibility from '@mui/icons-material/Visibility'
import VisibilityOff from '@mui/icons-material/VisibilityOff'
import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { authService } from '../services/api/auth'
import AuthLayout from '../components/AuthLayout'
import { fieldSx, primaryButtonSx } from '../styles/forms'
import { PALETTE } from '../styles/palette'

const schema = z.object({
  name: z.string().min(2, 'Vui lòng nhập tên'),
  phone: z.string().min(8, 'Số điện thoại chưa hợp lệ'),
  email: z.string().email('Email chưa hợp lệ'),
  password: z.string().min(6, 'Mật khẩu tối thiểu 6 ký tự'),
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
        status: 'online',
        created_at: user.created_at,
        updated_at: user.updated_at,
      })
      authService.setStatus(user.id, 'online').catch(() => {})
      navigate('/')
    },
  })

  return (
    <AuthLayout title="Czen" subtitle="Đăng ký để đặt chuyến đầu tiên">
      <Stack component="form" onSubmit={handleSubmit(data => register(data))} spacing={2.5}>
        <Controller name="name" control={control} render={({ field }) => (
          <TextField {...field} label="Họ tên" sx={fieldSx}
            placeholder="Nguyễn Văn A" error={!!errors.name} helperText={errors.name?.message} />
        )} />
        <Controller name="phone" control={control} render={({ field }) => (
          <TextField {...field} label="Số điện thoại" type="tel" sx={fieldSx}
            placeholder="+84901234567" error={!!errors.phone} helperText={errors.phone?.message} />
        )} />
        <Controller name="email" control={control} render={({ field }) => (
          <TextField {...field} label="Email" type="email" sx={fieldSx}
            placeholder="you@example.com" error={!!errors.email} helperText={errors.email?.message} />
        )} />
        <Controller name="password" control={control} render={({ field }) => (
          <TextField {...field} label="Mật khẩu" type={showPassword ? 'text' : 'password'} sx={fieldSx}
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
          <Typography variant="caption" color="error">
            Đăng ký thất bại. Kiểm tra lại thông tin.
          </Typography>
        )}

        <Button type="submit" variant="contained" size="large" disabled={isPending} sx={primaryButtonSx}>
          {isPending ? <CircularProgress size={22} color="inherit" /> : 'Đăng ký'}
        </Button>

        <Typography variant="body1" sx={{ textAlign: 'center', color: PALETTE.textSecondary }}>
          Đã có tài khoản?{' '}
          <MuiLink component={Link} to="/login" sx={{ color: PALETTE.primary, fontWeight: 700 }}>
            Đăng nhập
          </MuiLink>
        </Typography>
      </Stack>
    </AuthLayout>
  )
}
