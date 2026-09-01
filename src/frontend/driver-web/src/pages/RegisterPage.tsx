import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button, CircularProgress, IconButton, InputAdornment, Link as MuiLink, MenuItem, Stack, TextField, Typography } from '@mui/material'
import Visibility from '@mui/icons-material/Visibility'
import VisibilityOff from '@mui/icons-material/VisibilityOff'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useDriverRegister } from '../features/auth/hooks/useDriverRegister'
import AuthLayout from '../components/AuthLayout'
import { fieldSx, primaryButtonSx } from '../styles/forms'
import { PALETTE } from '../styles/palette'

const VEHICLE_TYPES = ['Xe máy', 'Ô tô 4 chỗ', 'Ô tô 7 chỗ', 'Xe tải'] as const

const schema = z.object({
  name: z.string().min(2, 'Vui lòng nhập tên'),
  phone: z.string().min(8, 'Số điện thoại chưa hợp lệ'),
  email: z.string().email('Email chưa hợp lệ'),
  password: z.string().min(6, 'Mật khẩu tối thiểu 6 ký tự'),
  vehicle_type: z.string().min(1, 'Vui lòng chọn loại xe'),
  vehicle_plate: z.string().min(4, 'Biển số chưa hợp lệ'),
  vehicle_name: z.string().min(2, 'Vui lòng nhập tên xe'),
})
type FormValues = z.infer<typeof schema>

export default function RegisterPage() {
  const { mutate: register, isPending, isError, error } = useDriverRegister()
  const [showPassword, setShowPassword] = useState(false)

  const { control, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', phone: '', email: '', password: '', vehicle_type: '', vehicle_plate: '', vehicle_name: '' },
  })

  return (
    <AuthLayout
      wide
      title="Czen Driver"
      subtitle="Đăng ký xe để bắt đầu nhận chuyến"
    >
      <Stack component="form" onSubmit={handleSubmit(data => register(data))} spacing={2}>
        <Controller name="name" control={control} render={({ field }) => (
          <TextField {...field} label="Họ tên" sx={fieldSx} error={!!errors.name} helperText={errors.name?.message} />
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
        <Controller name="vehicle_type" control={control} render={({ field }) => (
          <TextField {...field} select label="Loại xe" sx={fieldSx}
            error={!!errors.vehicle_type} helperText={errors.vehicle_type?.message}>
            {VEHICLE_TYPES.map(type => <MenuItem key={type} value={type}>{type}</MenuItem>)}
          </TextField>
        )} />
        <Controller name="vehicle_name" control={control} render={({ field }) => (
          <TextField {...field} label="Tên xe" sx={fieldSx}
            placeholder="Honda Wave, Toyota Vios..." error={!!errors.vehicle_name} helperText={errors.vehicle_name?.message} />
        )} />
        <Controller name="vehicle_plate" control={control} render={({ field }) => (
          <TextField {...field} label="Biển số" sx={fieldSx}
            placeholder="59-X1 123.45" error={!!errors.vehicle_plate} helperText={errors.vehicle_plate?.message} />
        )} />

        {isError && (
          <Typography variant="caption" color="error">
            {(error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Đăng ký thất bại. Kiểm tra lại thông tin.'}
          </Typography>
        )}

        <Button type="submit" variant="contained" size="large" disabled={isPending} sx={primaryButtonSx}>
          {isPending ? <CircularProgress size={22} color="inherit" /> : 'Tạo tài khoản'}
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
