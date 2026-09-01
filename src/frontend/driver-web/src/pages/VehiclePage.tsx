import { useState } from 'react'
import { Button, CardContent, CircularProgress, MenuItem, Stack, TextField, Typography } from '@mui/material'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import AppShell from '../components/AppShell'
import PageHeader from '../components/PageHeader'
import SurfaceCard from '../components/SurfaceCard'
import { useCurrentUser } from '../features/auth/hooks/useCurrentUser'
import { authService } from '../services/api/auth'
import { fieldSx, primaryButtonSx } from '../styles/forms'
import { PALETTE } from '../styles/palette'
import type { Driver } from '../types'

const VEHICLE_TYPES = ['Xe máy', 'Ô tô 4 chỗ', 'Ô tô 7 chỗ', 'Xe tải'] as const

function VehicleForm({ driver }: { driver: Driver }) {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [vehicleType, setVehicleType] = useState(driver.vehicle_type ?? '')
  const [vehicleName, setVehicleName] = useState(driver.vehicle_name ?? '')
  const [vehiclePlate, setVehiclePlate] = useState(driver.vehicle_plate ?? '')
  const [saved, setSaved] = useState(false)

  const { mutate: save, isPending, isError } = useMutation({
    mutationFn: () =>
      authService.updateVehicle(driver.id, {
        vehicle_type: vehicleType.trim(),
        vehicle_name: vehicleName.trim(),
        vehicle_plate: vehiclePlate.trim(),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['me'] })
      qc.invalidateQueries({ queryKey: ['driverContext'] })
      setSaved(true)
    },
  })

  const canSave =
    vehicleType.trim() !== (driver.vehicle_type ?? '') ||
    vehicleName.trim() !== (driver.vehicle_name ?? '') ||
    vehiclePlate.trim() !== (driver.vehicle_plate ?? '')

  return (
    <Stack spacing={3}>
      <SurfaceCard>
        <CardContent sx={{ p: { xs: 3, sm: 4 }, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            select
            label="Loại xe"
            value={vehicleType}
            onChange={e => setVehicleType(e.target.value)}
            sx={fieldSx}
          >
            {VEHICLE_TYPES.map(type => (
              <MenuItem key={type} value={type}>{type}</MenuItem>
            ))}
          </TextField>
          <TextField
            label="Tên xe"
            value={vehicleName}
            onChange={e => setVehicleName(e.target.value)}
            sx={fieldSx}
            placeholder="VD: Toyota Vios"
          />
          <TextField
            label="Biển số"
            value={vehiclePlate}
            onChange={e => setVehiclePlate(e.target.value.toUpperCase())}
            sx={fieldSx}
            placeholder="VD: 36B6-36363"
          />
        </CardContent>
      </SurfaceCard>

      {saved ? (
        <Typography variant="body2" sx={{ color: PALETTE.success, textAlign: 'center' }}>
          Thông tin xe đã được cập nhật.
        </Typography>
      ) : null}
      {isError ? (
        <Typography variant="caption" color="error" sx={{ textAlign: 'center' }}>
          Không thể lưu thông tin xe, vui lòng thử lại.
        </Typography>
      ) : null}

      <Button
        variant="contained"
        size="large"
        disabled={!canSave || isPending}
        onClick={() => save()}
        sx={primaryButtonSx}
      >
        {isPending ? <CircularProgress size={22} color="inherit" /> : 'Lưu thay đổi'}
      </Button>
      <Button variant="text" onClick={() => navigate('/profile')}>Quay lại hồ sơ</Button>
    </Stack>
  )
}

export default function VehiclePage() {
  const { data: driver } = useCurrentUser()

  if (!driver) return null

  return (
    <AppShell maxWidth="sm">
      <PageHeader title="Quản lý xe" subtitle="Cập nhật loại xe, tên và biển số hiển thị với khách hàng." />
      <VehicleForm key={driver.updated_at} driver={driver} />
    </AppShell>
  )
}
