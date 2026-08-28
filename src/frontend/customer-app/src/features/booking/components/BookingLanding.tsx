import { useState } from 'react'
import { View } from 'tamagui'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { router } from 'expo-router'
import * as Location from 'expo-location'
import { GlassBookingInput } from './GlassBookingInput'
import { AddressAutocompleteInput } from './AddressAutocompleteInput'
import { PickupTimeField, type ScheduleMode } from './PickupTimeField'
import { DriverPicker } from './DriverPicker'
import { GlassButton } from '../../../components/GlassButton'
import { Screen } from '../../../components/Screen'
import { Surface } from '../../../components/Surface'
import { AppText } from '../../../components/AppText'
import { useBookTrip } from '../../trips/hooks/useBookTrip'
import { placesService } from '../../../services/api/places'
import { haptics } from '../../../utils/haptics'
import type { Driver } from '../../../types'

const schema = z.object({
  customer_name: z.string().min(2, 'Vui lòng nhập tên'),
  customer_phone: z.string().min(8, 'Số điện thoại chưa hợp lệ'),
  pickup_address: z.string().min(5, 'Vui lòng nhập điểm đón'),
  dropoff_address: z.string().min(5, 'Vui lòng nhập điểm đến'),
  note: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

// Tab root for "Booking" — the address-search form (Goong autocomplete +
// GPS pickup + note + schedule) is the only booking flow now (the old
// "Gọi tài xế theo yêu cầu" quick-request shortcut was removed by request).
export function BookingLanding() {
  const { mutate: book, isPending, isError } = useBookTrip()
  const { control, handleSubmit, setValue, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { customer_name: '', customer_phone: '', pickup_address: '', dropoff_address: '', note: '' },
  })

  const [near, setNear] = useState<{ lat: number; lng: number } | undefined>()
  const [locating, setLocating] = useState(false)
  const [scheduleMode, setScheduleMode] = useState<ScheduleMode>('now')
  const [pickupAt, setPickupAt] = useState<Date | null>(null)
  const [scheduleError, setScheduleError] = useState<string | undefined>()

  // Replaces the old auto-match-by-location assignment — the customer must
  // explicitly pick who drives them (shared across quick/detailed modes,
  // same as the rest of the form state).
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null)
  const [driverError, setDriverError] = useState<string | undefined>()

  // Precise coordinates behind the pickup/dropoff text — set only from a
  // tapped autocomplete suggestion or the GPS fix, never from free typing
  // (see the wrapped onChangeText handlers below). The field itself always
  // shows the readable address; these are extra precision sent alongside,
  // not a replacement for it.
  const [pickupCoords, setPickupCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [dropoffCoords, setDropoffCoords] = useState<{ lat: number; lng: number } | null>(null)

  // Foreground-only (no background location) — reads the position once to
  // prefill the pickup field, same as tapping the field's own "current
  // location" pill later.
  const useCurrentLocation = async () => {
    setLocating(true)
    try {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') return
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
      const { latitude, longitude } = position.coords
      setNear({ lat: latitude, lng: longitude })
      setPickupCoords({ lat: latitude, lng: longitude })
      const address = await placesService.reverse(latitude, longitude)
      if (address) setValue('pickup_address', address, { shouldValidate: true })
    } catch {
      // GPS/reverse-geocode failing just leaves the pickup field blank and
      // searchable — never blocks booking.
    } finally {
      setLocating(false)
    }
  }

  const onSubmit = (data: FormValues) => {
    if (!selectedDriver) {
      setDriverError('Vui lòng chọn 1 tài xế')
      return
    }
    setDriverError(undefined)
    if (scheduleMode === 'later' && !pickupAt) {
      setScheduleError('Vui lòng chọn ngày & giờ đón')
      return
    }
    setScheduleError(undefined)
    book(
      {
        ...data,
        driver_phone: selectedDriver.phone,
        ...(pickupCoords ? { pickup_lat: pickupCoords.lat, pickup_lng: pickupCoords.lng } : {}),
        ...(dropoffCoords ? { dropoff_lat: dropoffCoords.lat, dropoff_lng: dropoffCoords.lng } : {}),
        ...(scheduleMode === 'later' && pickupAt ? { pickup_time: pickupAt.toISOString() } : {}),
      },
      {
        onSuccess: trip => {
          haptics.success()
          // Blank the form back out once booked — the driver-app card and
          // GET /trip/[id] screen (pushed to below) are now the record of
          // this trip; this screen is only ever for starting the *next* one.
          reset()
          setNear(undefined)
          setPickupCoords(null)
          setDropoffCoords(null)
          setScheduleMode('now')
          setPickupAt(null)
          setScheduleError(undefined)
          setSelectedDriver(null)
          setDriverError(undefined)
          router.push(`/trip/${trip.trip_id}`)
        },
      },
    )
  }

  return (
    <Screen scroll>
        <View>
          <AppText variant="h1">Đặt xe</AppText>
          <AppText variant="body" color="$textSecondary" marginTop="$1">
            Yêu cầu tài xế đến đón bạn chỉ với một chạm
          </AppText>
        </View>

        <Surface gap="$4" padding={20}>
          <Controller
            name="customer_name"
            control={control}
            render={({ field: { onChange, onBlur, value } }) => (
              <GlassBookingInput
                label="Họ tên"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.customer_name?.message}
              />
            )}
          />

          <Controller
            name="customer_phone"
            control={control}
            render={({ field: { onChange, onBlur, value } }) => (
              <GlassBookingInput
                label="Số điện thoại"
                keyboardType="phone-pad"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.customer_phone?.message}
              />
            )}
          />

          <Controller
            name="pickup_address"
            control={control}
            render={({ field: { onChange, value } }) => (
              <AddressAutocompleteInput
                label="Điểm đón"
                value={value}
                onChangeText={text => {
                  onChange(text)
                  setPickupCoords(null)
                }}
                onSelectSuggestion={(_, location) => {
                  if (location) setPickupCoords({ lat: location.lat, lng: location.lng })
                }}
                error={errors.pickup_address?.message}
                near={near}
                actionLabel="Vị trí hiện tại"
                onPressAction={useCurrentLocation}
                actionLoading={locating}
              />
            )}
          />

          <Controller
            name="dropoff_address"
            control={control}
            render={({ field: { onChange, value } }) => (
              <AddressAutocompleteInput
                label="Điểm đến"
                value={value}
                onChangeText={text => {
                  onChange(text)
                  setDropoffCoords(null)
                }}
                onSelectSuggestion={(_, location) => {
                  if (location) setDropoffCoords({ lat: location.lat, lng: location.lng })
                }}
                error={errors.dropoff_address?.message}
                near={near}
              />
            )}
          />

          <Controller
            name="note"
            control={control}
            render={({ field: { onChange, onBlur, value } }) => (
              <GlassBookingInput
                label="Ghi chú (không bắt buộc)"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                multiline
                numberOfLines={3}
                style={{ minHeight: 80, textAlignVertical: 'top' }}
              />
            )}
          />

          <View gap="$2">
            <AppText variant="label" color="$textSecondary">
              Thời gian đón
            </AppText>
            <PickupTimeField
              mode={scheduleMode}
              onModeChange={setScheduleMode}
              pickupAt={pickupAt}
              onPickupAtChange={date => {
                setPickupAt(date)
                setScheduleError(undefined)
              }}
              error={scheduleError}
            />
          </View>

          <DriverPicker selected={selectedDriver} onSelect={setSelectedDriver} error={driverError} />

          {isError && (
            <AppText variant="caption" color="$danger">
              Đặt xe thất bại. Vui lòng thử lại.
            </AppText>
          )}

          <GlassButton label="Đặt xe" onPress={handleSubmit(onSubmit)} loading={isPending} />
        </Surface>
    </Screen>
  )
}
