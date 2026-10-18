import { useState, type ChangeEvent, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import {
  Alert, Box, Button, CircularProgress,
  IconButton, InputAdornment, Stack, TextField, Typography,
} from '@mui/material'
import CheckRoundedIcon from '@mui/icons-material/CheckRounded'
import { BrandMark } from '../layouts/SettingsSidebar'
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
    <Box sx={{ minHeight: '100dvh', display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.1fr 1fr' }, bgcolor: PALETTE.shellContent }}>
      <Box
        sx={{
          display: { xs: 'none', md: 'flex' }, flexDirection: 'column', justifyContent: 'space-between',
          p: 6, position: 'relative', overflow: 'hidden',
          background: `radial-gradient(1200px 600px at -10% -10%, rgba(139,92,246,0.55), transparent 60%),
                       radial-gradient(800px 500px at 110% 110%, rgba(52,211,153,0.18), transparent 60%),
                       ${PALETTE.darkest}`,
          borderRight: `1px solid ${PALETTE.shellBorder}`,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <BrandMark size={40} />
          <Box>
            <Typography sx={{ fontWeight: 800, fontSize: 20, color: '#fff', lineHeight: 1.1 }}>Czen Ops</Typography>
            <Typography sx={{ fontSize: 13, color: PALETTE.pale, opacity: 0.75 }}>{t.shell.brandSubtitle}</Typography>
          </Box>
        </Box>
        <Box sx={{ maxWidth: 520 }}>
          <Typography sx={{ fontSize: 38, fontWeight: 800, lineHeight: 1.15, letterSpacing: '-0.03em', color: '#fff' }}>
            {t.login.heroTitle}
          </Typography>
          <Typography sx={{ mt: 2, fontSize: 16, lineHeight: 1.6, color: PALETTE.pale, opacity: 0.8 }}>
            {t.login.heroBody}
          </Typography>
          <Stack spacing={1.5} sx={{ mt: 4 }}>
            {t.login.features.map(f => (
              <Box key={f} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ width: 26, height: 26, borderRadius: '50%', display: 'grid', placeItems: 'center', bgcolor: 'rgba(52,211,153,0.15)', color: PALETTE.success }}>
                  <CheckRoundedIcon sx={{ fontSize: 16 }} />
                </Box>
                <Typography sx={{ color: '#fff', fontSize: 15 }}>{f}</Typography>
              </Box>
            ))}
          </Stack>
        </Box>
        <Typography sx={{ fontSize: 12, color: PALETTE.pale, opacity: 0.5 }}>© {new Date().getFullYear()} Czen · AI-Powered Driver Assistant</Typography>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', p: { xs: 3, md: 6 } }}>
        <Box sx={{ width: '100%', maxWidth: 400 }}>
          <Box sx={{ display: { xs: 'flex', md: 'none' }, alignItems: 'center', gap: 1.25, mb: 4 }}>
            <BrandMark size={36} />
            <Typography sx={{ fontWeight: 800, fontSize: 18 }}>Czen Ops</Typography>
          </Box>
          <Typography variant="h4" sx={{ mb: 1 }}>{t.login.title}</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>{t.login.subtitle}</Typography>
          <Box component="form" onSubmit={handleSubmit}>
            <Stack spacing={2.25}>
              <TextField label={t.login.email} type="email" required fullWidth value={form.email} onChange={set('email')} placeholder="ops@czen.vn" />
              <TextField
                label={t.login.password} type={showPassword ? 'text' : 'password'} required fullWidth
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
              <Button type="submit" variant="contained" size="large" disabled={isPending} sx={{ py: 1.4 }}>
                {isPending ? <CircularProgress size={22} color="inherit" /> : t.login.submit}
              </Button>
              <Box sx={{ pt: 1 }}>
                <LocalePicker />
              </Box>
            </Stack>
          </Box>
        </Box>
      </Box>
    </Box>
  )
}
