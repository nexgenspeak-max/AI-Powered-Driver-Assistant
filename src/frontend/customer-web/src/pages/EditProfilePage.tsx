import { useState } from 'react'
import { Avatar, Button, CardContent, CircularProgress, Stack, TextField, Typography } from '@mui/material'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import AppShell from '../components/AppShell'
import PageHeader from '../components/PageHeader'
import SurfaceCard from '../components/SurfaceCard'
import { useCurrentUser } from '../features/auth/hooks/useCurrentUser'
import { authService } from '../services/api/auth'
import { fieldSx, primaryButtonSx } from '../styles/forms'
import { PALETTE } from '../styles/palette'
import type { Customer } from '../types'

function EditProfileForm({ customer }: { customer: Customer }) {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [name, setName] = useState(customer.name)
  const [saved, setSaved] = useState(false)

  const { mutate: save, isPending, isError } = useMutation({
    mutationFn: () => authService.updateProfile(customer.id, { name: name.trim() }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['me'] })
      setSaved(true)
    },
  })

  const trimmedName = name.trim()
  const canSave = trimmedName.length > 0 && trimmedName !== customer.name

  return (
    <Stack spacing={3}>
      <Stack sx={{ alignItems: 'center', gap: 1 }}>
        <Avatar sx={{ width: 88, height: 88, bgcolor: PALETTE.primary, fontSize: '2rem', fontWeight: 700 }}>
          {(trimmedName || customer.name).charAt(0).toUpperCase()}
        </Avatar>
        <Typography variant="caption" sx={{ color: PALETTE.textMuted }}>
          Ảnh đại diện lấy theo chữ cái đầu của tên
        </Typography>
      </Stack>

      <SurfaceCard>
        <CardContent sx={{ p: { xs: 3, sm: 4 }, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label="Tên hiển thị"
            value={name}
            onChange={e => setName(e.target.value)}
            sx={fieldSx}
            placeholder="Nhập tên của bạn"
          />
          <TextField label="Số điện thoại" value={customer.phone} sx={fieldSx} disabled />
        </CardContent>
      </SurfaceCard>

      {saved ? (
        <Typography variant="body2" sx={{ color: PALETTE.success, textAlign: 'center' }}>
          Hồ sơ của bạn đã được cập nhật.
        </Typography>
      ) : null}
      {isError ? (
        <Typography variant="caption" color="error" sx={{ textAlign: 'center' }}>
          Không thể lưu hồ sơ, vui lòng thử lại.
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

export default function EditProfilePage() {
  const { data: customer } = useCurrentUser()

  if (!customer) return null

  return (
    <AppShell maxWidth="sm">
      <PageHeader title="Chỉnh sửa hồ sơ" subtitle="Cập nhật tên hiển thị trên ứng dụng." />
      <EditProfileForm key={customer.updated_at} customer={customer} />
    </AppShell>
  )
}
