import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button, CircularProgress, Stack, TextField } from '@mui/material'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import AppShell from '../components/AppShell'
import PageHeader from '../components/PageHeader'
import SurfaceCard from '../components/SurfaceCard'
import { deliveryOrdersService } from '../services/api/deliveryOrders'
import { fieldSx, primaryButtonSx } from '../styles/forms'

const schema = z.object({
  sender_phone: z.string().min(8, 'Vui lòng nhập SĐT người gửi'),
  sender_address: z.string().optional(),
  recipient_phone: z.string().min(8, 'Vui lòng nhập SĐT người nhận'),
  recipient_address: z.string().min(5, 'Vui lòng nhập địa chỉ nhận'),
  note: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

export default function AddDeliveryPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { control, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { sender_phone: '', sender_address: '', recipient_phone: '', recipient_address: '', note: '' },
  })

  const { mutate: create, isPending } = useMutation({
    mutationFn: (data: FormValues) => deliveryOrdersService.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['deliveryOrders'] })
      navigate('/dashboard')
    },
  })

  return (
    <AppShell maxWidth="md">
      <PageHeader title="Thêm đơn giao hàng" subtitle="Nhập thông tin người gửi và người nhận." />
      <SurfaceCard>
        <Stack component="form" onSubmit={handleSubmit(data => create(data))} spacing={2.5} sx={{ p: { xs: 3, sm: 4 } }}>
          <Controller name="sender_phone" control={control} render={({ field }) => (
            <TextField {...field} label="SĐT người gửi" sx={fieldSx} error={!!errors.sender_phone} helperText={errors.sender_phone?.message} />
          )} />
          <Controller name="sender_address" control={control} render={({ field }) => (
            <TextField {...field} label="Địa chỉ gửi (tuỳ chọn)" sx={fieldSx} />
          )} />
          <Controller name="recipient_phone" control={control} render={({ field }) => (
            <TextField {...field} label="SĐT người nhận" sx={fieldSx} error={!!errors.recipient_phone} helperText={errors.recipient_phone?.message} />
          )} />
          <Controller name="recipient_address" control={control} render={({ field }) => (
            <TextField {...field} label="Địa chỉ nhận" sx={fieldSx} error={!!errors.recipient_address} helperText={errors.recipient_address?.message} />
          )} />
          <Controller name="note" control={control} render={({ field }) => (
            <TextField {...field} label="Ghi chú" sx={fieldSx} multiline minRows={2} />
          )} />
          <Button type="submit" variant="contained" size="large" disabled={isPending} sx={primaryButtonSx}>
            {isPending ? <CircularProgress size={22} color="inherit" /> : 'Tạo đơn'}
          </Button>
        </Stack>
      </SurfaceCard>
    </AppShell>
  )
}
