import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import {
  Alert, Box, Button, Card, CardContent, CircularProgress,
  IconButton, InputAdornment, Stack, TextField, Typography,
} from '@mui/material'
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings'
import Visibility from '@mui/icons-material/Visibility'
import VisibilityOff from '@mui/icons-material/VisibilityOff'
import { useAuthStore } from '../stores/authStore'
import { authService } from '../services/api/auth'
import { ROUTES } from '../constants'
import { PALETTE } from '../styles/palette'

export default function LoginPage() {
  const navigate = useNavigate()
  const setAdmin = useAuthStore(s => s.setAdmin)
  const setTokens = useAuthStore(s => s.setTokens)
  const logout = useAuthStore(s => s.logout)
  const [showPassword, setShowPassword] = useState(false)
  const [form, setForm] = useState({ email: '', password: '' })

  const set = (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [k]: e.target.value }))

  const { mutate: login, isPending, error } = useMutation({
    mutationFn: async () => {
      // Login is token-only now (see services/api/auth.ts) — the profile
      // has to be fetched via me() before the role can even be checked, so
      // the token goes into the store first and comes back out (logout())
      // if the check below fails.
      const { access_token, refresh_token } = await authService.login({ role: 'admin', email: form.email, password: form.password })
      setTokens(access_token, refresh_token)
      const user = await authService.me()
      // auth-service's admin login looks up the account by email only (not scoped
      // by role), so a driver/customer account with the same email could otherwise
      // authenticate here — reject anything that isn't actually role=admin.
      if (user.role !== 'admin') {
        logout()
        throw new Error('Tài khoản này không có quyền truy cập Admin Panel.')
      }
      return user
    },
    onSuccess: user => {
      setAdmin({
        id: user.id,
        name: user.name,
        email: user.email ?? '',
        status: 'online',
        created_at: user.created_at,
        updated_at: user.updated_at,
      })
      authService.setStatus(user.id, 'online').catch(() => {})
      navigate(ROUTES.TRIP_BOARD)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    login()
  }

  const errorMsg = error
    ? ((error as any).response?.data?.detail ?? (error as Error).message ?? 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.')
    : null

  return (
    <Box sx={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 3,
      background: `linear-gradient(150deg, ${PALETTE.darkest} 0%, ${PALETTE.base} 55%, ${PALETTE.mid} 100%)`,
    }}>
      <Box sx={{ width: '100%', maxWidth: 400 }}>
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Box sx={{
            width: 64, height: 64, borderRadius: '18px', mx: 'auto', mb: 2,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: `linear-gradient(135deg, ${PALETTE.light} 0%, ${PALETTE.base} 100%)`,
          }}>
            <AdminPanelSettingsIcon sx={{ color: '#fff', fontSize: 34 }} />
          </Box>
          <Typography variant="h5" sx={{ fontWeight: 800, color: '#fff' }}>Admin Panel</Typography>
          <Typography variant="body2" sx={{ color: PALETTE.light, mt: 0.5 }}>
            Đăng nhập để quản lý hệ thống
          </Typography>
        </Box>

        <Card sx={{ borderRadius: 3 }}>
          <CardContent sx={{ p: 4 }}>
            <Box component="form" onSubmit={handleSubmit}>
              <Stack spacing={2.5}>
                <TextField
                  label="Email" type="email" required fullWidth size="small"
                  value={form.email} onChange={set('email')}
                  placeholder="admin@example.com"
                />
                <TextField
                  label="Mật khẩu" type={showPassword ? 'text' : 'password'} required fullWidth size="small"
                  value={form.password} onChange={set('password')}
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
                  }}
                />

                {errorMsg && <Alert severity="error">{errorMsg}</Alert>}

                <Button type="submit" variant="contained" size="large" disabled={isPending}
                  sx={{
                    py: 1.5, fontWeight: 700, borderRadius: 2, textTransform: 'none',
                    background: `linear-gradient(135deg, ${PALETTE.base} 0%, ${PALETTE.mid} 100%)`,
                    '&:hover': { background: `linear-gradient(135deg, ${PALETTE.darkest} 0%, ${PALETTE.base} 100%)` },
                  }}>
                  {isPending ? <CircularProgress size={22} color="inherit" /> : 'Đăng nhập'}
                </Button>
              </Stack>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Box>
  )
}
