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
  phone: z.string().min(8, 'Số điện thoại chưa hợp lệ'),
  password: z.string().min(6, 'Mật khẩu tối thiểu 6 ký tự'),
})
type FormValues = z.infer<typeof schema>

export default function LoginPage() {
  const navigate = useNavigate()
  const setCustomer = useAuthStore(s => s.setCustomer)
  const setTokens = useAuthStore(s => s.setTokens)
  const [showPassword, setShowPassword] = useState(false)

  const { control, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { phone: '', password: '' },
  })

  const { mutate: login, isPending, isError, error } = useMutation({
    mutationFn: (data: FormValues) => authService.login({ role: 'customer', phone: data.phone, password: data.password }),
    onSuccess: async ({ access_token, refresh_token }) => {
      setTokens(access_token, refresh_token)
      const user = await authService.me()
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
    <AuthLayout title="Czen" subtitle="Đăng nhập để đặt chuyến tiếp theo">
      <Stack component="form" onSubmit={handleSubmit(data => login(data))} spacing={2.5}>
        <Controller name="phone" control={control} render={({ field }) => (
          <TextField {...field} label="Số điện thoại" type="tel" sx={fieldSx}
            placeholder="+84901234567" error={!!errors.phone} helperText={errors.phone?.message} />
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
            {(error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Đăng nhập thất bại. Kiểm tra lại thông tin.'}
          </Typography>
        )}

        <Button type="submit" variant="contained" size="large" disabled={isPending} sx={primaryButtonSx}>
          {isPending ? <CircularProgress size={22} color="inherit" /> : 'Đăng nhập'}
        </Button>

        <Typography variant="body1" sx={{ textAlign: 'center', color: PALETTE.textSecondary }}>
          Chưa có tài khoản?{' '}
          <MuiLink component={Link} to="/register" sx={{ color: PALETTE.primary, fontWeight: 700 }}>
            Đăng ký
          </MuiLink>
        </Typography>
      </Stack>
    </AuthLayout>
  )
}
