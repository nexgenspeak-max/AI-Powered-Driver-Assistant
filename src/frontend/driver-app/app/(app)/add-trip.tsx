import { Alert } from 'react-native'
import { XStack, YStack } from 'tamagui'
import { useForm, Controller } from 'react-hook-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { router } from 'expo-router'
import { Screen } from '../../src/components/Screen'
import { Surface } from '../../src/components/Surface'
import { AppText } from '../../src/components/AppText'
import { GlassAuthInput } from '../../src/components/GlassAuthInput'
import { GlassButton } from '../../src/components/GlassButton'
import { Toggle } from '../../src/components/Toggle'
import { tripsService } from '../../src/services/api/trips'

const schema = z.object({
  customer_phone: z.string().min(8, 'Vui lòng nhập số điện thoại khách'),
  customer_name: z.string().optional(),
  pickup_address: z.string().min(3, 'Vui lòng nhập điểm đón'),
  dropoff_address: z.string().min(3, 'Vui lòng nhập điểm trả'),
  note: z.string().optional(),
  has_bulky_goods: z.boolean(),
  with_children: z.boolean(),
})
type FormValues = z.infer<typeof schema>

export default function AddTripScreen() {
  const qc = useQueryClient()

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      customer_phone: '',
      customer_name: '',
      pickup_address: '',
      dropoff_address: '',
      note: '',
      has_bulky_goods: false,
      with_children: false,
    },
  })

  const { mutate: createTrip, isPending: isSaving } = useMutation({
    mutationFn: (data: FormValues) =>
      tripsService.createWalkup({
        customer_phone: data.customer_phone.trim(),
        customer_name: data.customer_name?.trim() || undefined,
        pickup_address: data.pickup_address.trim(),
        dropoff_address: data.dropoff_address.trim(),
        note: data.note?.trim() || undefined,
        has_bulky_goods: data.has_bulky_goods,
        with_children: data.with_children,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['driverContext'] })
      // Hidden tab (`href: null`) — replace back to dashboard (not router.back()).
      router.replace('/dashboard')
    },
    onError: (err: unknown) => {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      Alert.alert('Không tạo được chuyến', detail || 'Vui lòng thử lại.')
    },
  })

  return (
    <Screen scroll title="Thêm chuyến (tự tạo)" backTo="/dashboard">
      <AppText variant="body" color="$textSecondary">
        Chuyến sẽ vào ngay Đang chạy — không hiện banner nhận chuyến.
      </AppText>

      <Surface>
        <YStack padding="$4" gap="$4">
          <AppText variant="h2">Khách hàng</AppText>
          <Controller
            name="customer_phone"
            control={control}
            render={({ field: { onChange, onBlur, value } }) => (
              <GlassAuthInput
                label="Số điện thoại khách"
                placeholder="09xxxxxxxx"
                keyboardType="phone-pad"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.customer_phone?.message}
              />
            )}
          />
          <Controller
            name="customer_name"
            control={control}
            render={({ field: { onChange, onBlur, value } }) => (
              <GlassAuthInput
                label="Tên khách (nếu có)"
                placeholder="Anh/chị…"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.customer_name?.message}
              />
            )}
          />
        </YStack>
      </Surface>

      <Surface>
        <YStack padding="$4" gap="$4">
          <AppText variant="h2">Lộ trình</AppText>
          <Controller
            name="pickup_address"
            control={control}
            render={({ field: { onChange, onBlur, value } }) => (
              <GlassAuthInput
                label="Điểm đón"
                placeholder="Số nhà, đường, phường/xã…"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.pickup_address?.message}
              />
            )}
          />
          <Controller
            name="dropoff_address"
            control={control}
            render={({ field: { onChange, onBlur, value } }) => (
              <GlassAuthInput
                label="Điểm trả"
                placeholder="Số nhà, đường, phường/xã…"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.dropoff_address?.message}
              />
            )}
          />
          <Controller
            name="note"
            control={control}
            render={({ field: { onChange, onBlur, value } }) => (
              <GlassAuthInput
                label="Ghi chú (nếu có)"
                placeholder="Ghi chú thêm…"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.note?.message}
              />
            )}
          />
        </YStack>
      </Surface>

      <Surface>
        <YStack padding="$4" gap="$4">
          <AppText variant="h2">Yêu cầu đặc biệt</AppText>
          <Controller
            name="has_bulky_goods"
            control={control}
            render={({ field: { onChange, value } }) => (
              <XStack alignItems="center" justifyContent="space-between" minHeight={44} gap="$3">
                <AppText variant="body" flex={1}>
                  Hàng hoá cồng kềnh
                </AppText>
                <Toggle
                  value={value}
                  onValueChange={onChange}
                  accessibilityLabel="Hàng hoá cồng kềnh"
                />
              </XStack>
            )}
          />
          <Controller
            name="with_children"
            control={control}
            render={({ field: { onChange, value } }) => (
              <XStack alignItems="center" justifyContent="space-between" minHeight={44} gap="$3">
                <AppText variant="body" flex={1}>
                  Đi cùng trẻ em
                </AppText>
                <Toggle
                  value={value}
                  onValueChange={onChange}
                  accessibilityLabel="Đi cùng trẻ em"
                />
              </XStack>
            )}
          />
        </YStack>
      </Surface>

      <GlassButton label="Thêm chuyến" onPress={handleSubmit(data => createTrip(data))} loading={isSaving} />
    </Screen>
  )
}
