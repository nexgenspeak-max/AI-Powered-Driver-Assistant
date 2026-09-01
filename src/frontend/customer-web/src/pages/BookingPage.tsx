import { useState } from 'react'
import Grid from '@mui/material/Grid'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Box, Button, CardContent, CircularProgress, Stack, TextField, Typography } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import AppShell from '../components/AppShell'
import PageHeader from '../components/PageHeader'
import SurfaceCard from '../components/SurfaceCard'
import AddressAutocompleteInput from '../features/booking/components/AddressAutocompleteInput'
import DriverPicker from '../features/booking/components/DriverPicker'
import { useBookTrip } from '../features/trips/hooks/useBookTrip'
import { useBookingStore } from '../stores/bookingStore'
import { useAuthStore } from '../stores/authStore'
import { fieldSx, primaryButtonSx } from '../styles/forms'
import { PALETTE } from '../styles/palette'
import type { Customer, Driver } from '../types'

const schema = z.object({
  customer_name: z.string().min(2, 'Vui lòng nhập tên'),
  customer_phone: z.string().min(8, 'Số điện thoại chưa hợp lệ'),
  pickup_address: z.string().min(5, 'Vui lòng nhập điểm đón'),
  dropoff_address: z.string().min(5, 'Vui lòng nhập điểm đến'),
  pickup_time: z.string().optional(),
  note: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

function BookingForm({
  customer,
  activeTripId,
}: {
  customer: Customer
  activeTripId: string | null
}) {
  const navigate = useNavigate()
  const { mutate: book, isPending, isError, error } = useBookTrip()
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null)
  const [driverError, setDriverError] = useState<string | undefined>()
  const [pickupLat, setPickupLat] = useState<number | undefined>()
  const [pickupLng, setPickupLng] = useState<number | undefined>()
  const [dropoffLat, setDropoffLat] = useState<number | undefined>()
  const [dropoffLng, setDropoffLng] = useState<number | undefined>()

  const { control, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      customer_name: customer.name,
      customer_phone: customer.phone,
      pickup_address: '',
      dropoff_address: '',
      pickup_time: '',
      note: '',
    },
  })

  return (
    <>
      {activeTripId ? (
        <SurfaceCard sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="body2">
              Bạn có chuyến đang hoạt động.{' '}
              <Box
                component="span"
                sx={{ color: PALETTE.primary, fontWeight: 700, textDecoration: 'underline', cursor: 'pointer' }}
                onClick={() => navigate(`/trip/${activeTripId}`)}
              >
                Xem trạng thái →
              </Box>
            </Typography>
          </CardContent>
        </SurfaceCard>
      ) : null}

      <Grid container spacing={4}>
        <Grid size={{ xs: 12, md: 7 }}>
          <SurfaceCard>
            <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
              <Stack
                component="form"
                onSubmit={handleSubmit(data => {
                  if (!selectedDriver) {
                    setDriverError('Vui lòng chọn tài xế')
                    return
                  }
                  setDriverError(undefined)
                  book({
                    ...data,
                    driver_phone: selectedDriver.phone,
                    pickup_lat: pickupLat,
                    pickup_lng: pickupLng,
                    dropoff_lat: dropoffLat,
                    dropoff_lng: dropoffLng,
                    pickup_time: data.pickup_time || undefined,
                    note: data.note || undefined,
                  }, { onSuccess: trip => navigate(`/trip/${trip.trip_id}`) })
                })}
                spacing={2.5}
              >
                <Controller name="customer_name" control={control} render={({ field }) => (
                  <TextField {...field} label="Họ tên" sx={fieldSx}
                    error={!!errors.customer_name} helperText={errors.customer_name?.message} />
                )} />
                <Controller name="customer_phone" control={control} render={({ field }) => (
                  <TextField {...field} label="Số điện thoại" type="tel" sx={fieldSx}
                    error={!!errors.customer_phone} helperText={errors.customer_phone?.message} />
                )} />

                <DriverPicker
                  selected={selectedDriver}
                  onSelect={driver => {
                    setSelectedDriver(driver)
                    if (driver) setDriverError(undefined)
                  }}
                  error={driverError}
                />

                <Controller name="pickup_address" control={control} render={({ field }) => (
                  <AddressAutocompleteInput
                    label="Điểm đón"
                    value={field.value}
                    onChange={(address, lat, lng) => {
                      field.onChange(address)
                      setPickupLat(lat)
                      setPickupLng(lng)
                    }}
                    error={errors.pickup_address?.message}
                  />
                )} />
                <Controller name="dropoff_address" control={control} render={({ field }) => (
                  <AddressAutocompleteInput
                    label="Điểm đến"
                    value={field.value}
                    onChange={(address, lat, lng) => {
                      field.onChange(address)
                      setDropoffLat(lat)
                      setDropoffLng(lng)
                    }}
                    error={errors.dropoff_address?.message}
                  />
                )} />

                <Controller name="pickup_time" control={control} render={({ field }) => (
                  <TextField
                    {...field}
                    label="Thời gian đón (không bắt buộc)"
                    type="datetime-local"
                    sx={fieldSx}
                    slotProps={{ inputLabel: { shrink: true } }}
                  />
                )} />

                <Controller name="note" control={control} render={({ field }) => (
                  <TextField {...field} label="Ghi chú (không bắt buộc)" sx={fieldSx} multiline minRows={3} />
                )} />

                {isError ? (
                  <Typography variant="caption" color="error">
                    {(error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Đặt xe thất bại. Vui lòng thử lại.'}
                  </Typography>
                ) : null}

                <Button type="submit" variant="contained" size="large" disabled={isPending} sx={primaryButtonSx}>
                  {isPending ? <CircularProgress size={22} color="inherit" /> : 'Đặt xe'}
                </Button>
              </Stack>
            </CardContent>
          </SurfaceCard>
        </Grid>
        <Grid size={{ xs: 12, md: 5 }}>
          <SurfaceCard sx={{ height: '100%' }}>
            <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Mẹo đặt xe</Typography>
              <Typography variant="body2" sx={{ color: PALETTE.textSecondary, mb: 2 }}>
                Chọn tài xế đang online và nhập địa chỉ rõ ràng để tài xế dễ tìm. Sau khi đặt, trang trạng thái sẽ tự cập nhật qua websocket.
              </Typography>
              <Typography variant="body2" sx={{ color: PALETTE.textSecondary }}>
                Cần hỗ trợ nhanh? Mở Trợ lý AI từ trang chủ để hỏi bằng giọng nói hoặc tin nhắn.
              </Typography>
            </CardContent>
          </SurfaceCard>
        </Grid>
      </Grid>
    </>
  )
}

export default function BookingPage() {
  const customer = useAuthStore(s => s.customer)
  const activeTripId = useBookingStore(s => s.activeTripId)

  if (!customer) return null

  return (
    <AppShell maxWidth="lg">
      <PageHeader
        title="Đặt xe"
        subtitle="Điền thông tin chuyến đi. Sau khi gửi, bạn có thể theo dõi trạng thái trên trang chi tiết."
      />
      <BookingForm key={customer.id} customer={customer} activeTripId={activeTripId} />
    </AppShell>
  )
}
