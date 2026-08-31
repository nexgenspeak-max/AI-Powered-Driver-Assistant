import { useNavigate } from 'react-router-dom'
import {
  Box, TextField, MenuItem,
  Button, Stack, Alert, CircularProgress,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import SendIcon from '@mui/icons-material/Send'
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

  return (
    <SettingsPanel>
      <Box component="form" onSubmit={handleSubmit} sx={{ p: { xs: 2, sm: 3 } }}>
        <Box sx={formGridSx}>
          <TextField
            select
            label={f.driver}
            value={form.driver_phone}
            onChange={set('driver_phone')}
            required
            fullWidth
            size="small"
            sx={{ gridColumn: { xs: '1', md: '1 / -1' } }}
          >
            <MenuItem value=""><em>{c.common.selectDriver}</em></MenuItem>
            {drivers.map((d: Driver) => (
              <MenuItem key={d.phone} value={d.phone}>
                {d.name} — {d.phone} ({accountStatusLabel(d.status)})
              </MenuItem>
            ))}
          </TextField>

          <TextField
            label={f.customerName}
            value={form.customer_name}
            onChange={set('customer_name')}
            placeholder={f.ph.customerName}
            required
            fullWidth
            size="small"
          />
          <TextField
            label={f.customerPhone}
            value={form.customer_phone}
            onChange={set('customer_phone')}
            placeholder={f.ph.customerPhone}
            required
            fullWidth
            size="small"
          />

          <TextField
            label={f.pickupAddress}
            value={form.pickup_address}
            onChange={set('pickup_address')}
            placeholder={f.ph.pickup}
            required
            fullWidth
            size="small"
          />
          <TextField
            label={f.dropoffAddress}
            value={form.dropoff_address}
            onChange={set('dropoff_address')}
            placeholder={f.ph.dropoff}
            required
            fullWidth
            size="small"
          />

          <TextField
            label={f.pickupTime}
            type="datetime-local"
            value={toDatetimeLocalValue(form.pickup_time)}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                pickup_time: isoFromDatetimeLocalValue(e.target.value),
              }))
            }
            slotProps={{
              inputLabel: { shrink: true },
              htmlInput: { min: minDatetimeLocalValue() },
            }}
            fullWidth
            size="small"
            sx={{ gridColumn: { xs: '1', md: '1 / 2' }, maxWidth: { md: 360 } }}
          />
        </Box>

        {errorMsg ? <Alert severity="error" sx={{ mt: 2 }}>{errorMsg}</Alert> : null}

        <Stack
          direction={{ xs: 'column-reverse', sm: 'row' }}
          spacing={1.5}
          sx={{ pt: 3, justifyContent: 'flex-end' }}
        >
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate(ROUTES.TRIP_BOARD)}
            sx={{ borderRadius: 2, minHeight: 44, minWidth: { sm: 140 } }}
          >
            {f.cancel}
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={isPending}
            endIcon={isPending ? <CircularProgress size={16} color="inherit" /> : <SendIcon />}
            sx={{ borderRadius: 2, minHeight: 44, minWidth: { sm: 220 } }}
          >
            {isPending ? f.submitting : f.submit}
          </Button>
        </Stack>
      </Box>
    </SettingsPanel>
  )
}
