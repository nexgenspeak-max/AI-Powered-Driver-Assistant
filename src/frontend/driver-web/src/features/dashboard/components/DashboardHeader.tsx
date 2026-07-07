import { Box, Stack, Switch, Typography } from '@mui/material'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../../../stores/authStore'
import { driversService } from '../../../services/api/drivers'

export default function DashboardHeader() {
  const driver    = useAuthStore(s => s.driver)!
  const setDriver = useAuthStore(s => s.setDriver)
  const qc        = useQueryClient()

  const isOnline = driver.status === 'online'

  const { mutate: toggleOnline } = useMutation({
    mutationFn: (online: boolean) =>
      driversService.update(driver.phone, { status: online ? 'online' : 'offline' }),
    onSuccess: d => { setDriver(d); qc.invalidateQueries({ queryKey: ['trips', 'driver'] }) },
  })

  return (
    <Box sx={{ bgcolor: '#1a1f36', px: 3, pt: 6, pb: 3 }}>
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <Stack direction="row" sx={{ alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ width: 40, height: 40, bgcolor: '#6c8aff', borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography sx={{ fontWeight: 700, color: 'white' }}>{driver.name.charAt(0).toUpperCase()}</Typography>
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 700, color: 'white' }}>{driver.name}</Typography>
            <Typography variant="caption" sx={{ color: 'grey.400' }}>{driver.phone}</Typography>
          </Box>
        </Stack>
        <Stack direction="row" sx={{ alignItems: 'center', gap: 1 }}>
          <Typography variant="caption" sx={{ color: isOnline ? '#4ade80' : 'grey.500', fontWeight: 600 }}>
            {isOnline ? 'Online' : 'Offline'}
          </Typography>
          <Switch checked={isOnline} onChange={e => toggleOnline(e.target.checked)}
            sx={{ '& .MuiSwitch-track': { bgcolor: isOnline ? '#166534' : undefined } }} />
        </Stack>
      </Stack>
    </Box>
  )
}
