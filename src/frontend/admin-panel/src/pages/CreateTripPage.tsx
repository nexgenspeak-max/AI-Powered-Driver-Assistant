import { useNavigate } from 'react-router-dom'
import {
  Box, TextField, MenuItem, Typography,
  Button, Stack, Alert, CircularProgress,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import SendIcon from '@mui/icons-material/Send'
import PersonOutlineIcon from '@mui/icons-material/PersonOutlined'
import RouteOutlinedIcon from '@mui/icons-material/RouteOutlined'
import LocalTaxiOutlinedIcon from '@mui/icons-material/LocalTaxiOutlined'
import { PALETTE } from '../styles/palette'
import { useState } from 'react'
import { useCreateTrip } from '../features/trips/hooks/useCreateTrip'
import { useDrivers } from '../features/drivers/hooks/useDrivers'
import { ROUTES } from '../constants'
import { SettingsPanel } from '../layouts/SettingsPanel'
import { useAdminContent } from '../i18n/useAdminContent'
import { getErrorDetail } from '../utils/errors'
import { isoFromDatetimeLocalValue, minDatetimeLocalValue, toDatetimeLocalValue } from '../utils/datetimeLocal'
import type { Driver } from '../types'

const formGridSx = {
  display: 'grid',
  gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
  gap: 2,
  alignItems: 'start',
} as const

export default function CreateTripPage() {
  const navigate = useNavigate()
  const { data: drivers = [] } = useDrivers()
  const { mutate: createTrip, isPending, error } = useCreateTrip()
  const { c, accountStatusLabel } = useAdminContent()
  const f = c.createTrip

  const [form, setForm] = useState({
    driver_phone:    '',
    customer_name:   '',
    customer_phone:  '',
    pickup_address:  '',
    dropoff_address: '',
    pickup_time:     '',
  })

  const set = (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(prev => ({ ...prev, [k]: e.target.value }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createTrip({ ...form, booked_via: 'admin' }, {
      onSuccess: () => navigate(ROUTES.TRIP_BOARD),
    })
  }

  const errorMsg = error ? getErrorDetail(error, f.failed) : null

  const driver = drivers.find(d => d.phone === form.driver_phone)
  const section = (icon: React.ReactNode, title: string) => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 2, gridColumn: '1 / -1' }}>
      <Box sx={{ width: 30, height: 30, borderRadius: 1.25, display: 'grid', placeItems: 'center', bgcolor: PALETTE.shellNavActive, color: PALETTE.light }}>{icon}</Box>
      <Typography sx={{ fontWeight: 700, fontSize: 15 }}>{title}</Typography>
    </Box>
  )
  const sectionSx = { p: { xs: 2, sm: 3 }, '& + &': { borderTop: `1px solid ${PALETTE.shellBorder}` } } as const

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1fr) 340px' }, gap: 3, alignItems: 'start' }}>
      <SettingsPanel>
        <Box sx={sectionSx}>
          <Box sx={formGridSx}>
            {section(<PersonOutlineIcon sx={{ fontSize: 18 }} />, f.sections.customer)}
            <TextField label={f.customerName} value={form.customer_name} onChange={set('customer_name')} placeholder={f.ph.customerName} required fullWidth />
            <TextField label={f.customerPhone} value={form.customer_phone} onChange={set('customer_phone')} placeholder={f.ph.customerPhone} required fullWidth />
          </Box>
        </Box>
        <Box sx={sectionSx}>
          <Box sx={formGridSx}>
            {section(<RouteOutlinedIcon sx={{ fontSize: 18 }} />, f.sections.route)}
            <TextField label={f.pickupAddress} value={form.pickup_address} onChange={set('pickup_address')} placeholder={f.ph.pickup} required fullWidth />
            <TextField label={f.dropoffAddress} value={form.dropoff_address} onChange={set('dropoff_address')} placeholder={f.ph.dropoff} required fullWidth />
          </Box>
        </Box>
        <Box sx={sectionSx}>
          <Box sx={formGridSx}>
            {section(<LocalTaxiOutlinedIcon sx={{ fontSize: 18 }} />, f.sections.assignment)}
            <TextField select label={f.driver} value={form.driver_phone} onChange={set('driver_phone')} required fullWidth>
              <MenuItem value=""><em>{c.common.selectDriver}</em></MenuItem>
              {drivers.map((d: Driver) => (
                <MenuItem key={d.phone} value={d.phone}>
                  {d.name} — {d.phone} ({accountStatusLabel(d.status)})
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label={f.pickupTime}
              type="datetime-local"
              value={toDatetimeLocalValue(form.pickup_time)}
              onChange={(e) => setForm(prev => ({ ...prev, pickup_time: isoFromDatetimeLocalValue(e.target.value) }))}
              slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: minDatetimeLocalValue() } }}
              fullWidth
            />
          </Box>
        </Box>
      </SettingsPanel>

      <SettingsPanel sx={{ position: { lg: 'sticky' }, top: { lg: 24 } }}>
        <Box sx={{ p: 3 }}>
          <Typography sx={{ fontWeight: 700, fontSize: 15, mb: 2 }}>{f.summaryTitle}</Typography>
          <Stack spacing={1.75}>
            <Box>
              <Typography variant="caption" color="text.secondary">{f.sections.customer}</Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>{form.customer_name || '—'}</Typography>
              <Typography variant="caption" color="text.secondary">{form.customer_phone}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">{f.sections.route}</Typography>
              {[[PALETTE.light, form.pickup_address], [PALETTE.success, form.dropoff_address]].map(([color, text], i) => (
                <Box key={i} sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', mt: 0.5 }}>
                  <Box sx={{ width: 8, height: 8, mt: 0.75, borderRadius: '50%', bgcolor: color, flexShrink: 0 }} />
                  <Typography variant="body2">{text || '—'}</Typography>
                </Box>
              ))}
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">{f.sections.assignment}</Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>{driver ? driver.name : '—'}</Typography>
              <Typography variant="caption" color="text.secondary">{form.pickup_time ? new Date(form.pickup_time).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' }) : ''}</Typography>
            </Box>
          </Stack>
          <Box sx={{ mt: 2.5, p: 1.5, borderRadius: 1.5, bgcolor: PALETTE.shellElevated, border: `1px solid ${PALETTE.shellBorder}` }}>
            <Typography variant="caption" color="text.secondary">{f.summaryHint}</Typography>
          </Box>
          {errorMsg ? <Alert severity="error" sx={{ mt: 2 }}>{errorMsg}</Alert> : null}
          <Stack spacing={1.25} sx={{ mt: 2.5 }}>
            <Button type="submit" variant="contained" size="large" disabled={isPending}
              endIcon={isPending ? <CircularProgress size={16} color="inherit" /> : <SendIcon />}>
              {isPending ? f.submitting : f.submit}
            </Button>
            <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => navigate(ROUTES.TRIP_BOARD)}>
              {f.cancel}
            </Button>
          </Stack>
        </Box>
      </SettingsPanel>
    </Box>
  )
}
