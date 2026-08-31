import { useState, type ChangeEvent, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import {
  Alert, Box, Button, Card, CardContent, CircularProgress,
  IconButton, InputAdornment, Stack, TextField, Typography,
} from '@mui/material'
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined'
import Visibility from '@mui/icons-material/Visibility'
import VisibilityOff from '@mui/icons-material/VisibilityOff'
import { LocalePicker } from '../components/LocalePicker'
import { useOpsLocale } from '../i18n/useOpsLocale'
import { useAuthStore } from '../stores/authStore'
import { authService } from '../services/api/auth'
import { ROUTES } from '../constants'
import { PALETTE } from '../styles/palette'
import { getErrorDetail } from '../utils/errors'

export default function LoginPage() {
  const navigate = useNavigate()
  const setUser = useAuthStore(s => s.setUser)
  const setTokens = useAuthStore(s => s.setTokens)
  const logout = useAuthStore(s => s.logout)
  const { t } = useOpsLocale()
  const [showPassword, setShowPassword] = useState(false)
  const [form, setForm] = useState({ email: '', password: '' })

  const set = (k: keyof typeof form) =>
    (e: ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [k]: e.target.value }))

  const { mutate: login, isPending, error } = useMutation({
    mutationFn: async () => {
      const { access_token, refresh_token } = await authService.login({
        role: 'super_admin',
        email: form.email,
        password: form.password,
      })
      setTokens(access_token, refresh_token)
      const user = await authService.me()
      if (user.role !== 'super_admin') {
        logout()
        throw new Error(t.login.accessDenied)
      }
      return user
    },
    onSuccess: user => {
      setUser({
        id: user.id,
        name: user.name,
        email: user.email ?? '',
        status: user.status,
        created_at: user.created_at,
        updated_at: user.updated_at,
      })
      navigate(ROUTES.OVERVIEW)
    },
  })

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    login()
  }

  const errorMsg = error ? getErrorDetail(error, t.login.failed) : null

  return (
    <Box sx={{
      minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 3,
      background: `linear-gradient(150deg, ${PALETTE.darkest} 0%, ${PALETTE.base} 55%, ${PALETTE.mid} 100%)`,
    }}>
      <Box sx={{ width: '100%', maxWidth: 400 }}>
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Box sx={{
            width: 64, height: 64, borderRadius: '18px', mx: 'auto', mb: 2,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: `linear-gradient(135deg, ${PALETTE.light} 0%, ${PALETTE.base} 100%)`,
          }}>
            <ShieldOutlinedIcon sx={{ color: '#fff', fontSize: 34 }} />
          </Box>
          <Typography variant="h5" sx={{ fontWeight: 800, color: '#fff' }}>{t.login.title}</Typography>
          <Typography variant="body2" sx={{ color: PALETTE.light, mt: 0.5 }}>
            {t.login.subtitle}
          </Typography>
        </Box>

        <Card sx={{ borderRadius: 3 }}>
          <CardContent sx={{ p: 4 }}>
            <Box component="form" onSubmit={handleSubmit}>
              <Stack spacing={2.5}>
                <LocalePicker variant="compact" />

                <TextField
                  label={t.login.email} type="email" required fullWidth size="small"
                  value={form.email} onChange={set('email')}
                  placeholder="ops@example.com"
                />
                <TextField
                  label={t.login.password} type={showPassword ? 'text' : 'password'} required fullWidth size="small"
                  value={form.password} onChange={set('password')}
                  slotProps={{
                    input: {
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={() => setShowPassword(v => !v)}
                            edge="end"
                            aria-label={t.login.password}
                            sx={{ width: 44, height: 44 }}
                          >
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
                  {isPending ? <CircularProgress size={22} color="inherit" /> : t.login.submit}
                </Button>
              </Stack>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Box>
  )
}
