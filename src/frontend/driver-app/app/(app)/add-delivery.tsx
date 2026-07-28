import { useState } from 'react'
import { ScrollView, TouchableOpacity, Image, Alert, ActivityIndicator } from 'react-native'
import { View, YStack, Text } from 'tamagui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useForm, Controller } from 'react-hook-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import { BackButton, getBackButtonClearance } from '../../src/components/BackButton'
import { GlassSurface } from '../../src/components/GlassSurface'
import { GlassAuthInput } from '../../src/components/GlassAuthInput'
import { GlassButton } from '../../src/components/GlassButton'
import { deliveryOrdersService } from '../../src/services/api/deliveryOrders'

const schema = z.object({
  sender_phone: z.string().min(8, 'Vui lòng nhập số điện thoại người gửi'),
  sender_address: z.string().optional(),
  recipient_phone: z.string().min(8, 'Vui lòng nhập số điện thoại người nhận'),
  recipient_address: z.string().min(5, 'Vui lòng nhập địa chỉ nhận'),
})
type FormValues = z.infer<typeof schema>

export default function AddDeliveryScreen() {
  const insets = useSafeAreaInsets()
  const qc = useQueryClient()
  const [photoUri, setPhotoUri] = useState<string | undefined>()

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { sender_phone: '', sender_address: '', recipient_phone: '', recipient_address: '' },
  })

  // AI only fills in what it could actually read off the photo — fields it
  // returns null for are left as whatever the driver already typed, never
  // blanked out.
  const { mutate: scanPhoto, isPending: isScanning } = useMutation({
    mutationFn: ({ base64, mimeType }: { base64: string; mimeType?: string }) =>
      deliveryOrdersService.scan(base64, mimeType),
    onSuccess: extracted => {
      if (extracted.sender_phone) setValue('sender_phone', extracted.sender_phone, { shouldValidate: true })
      if (extracted.sender_address) setValue('sender_address', extracted.sender_address, { shouldValidate: true })
      if (extracted.recipient_phone) setValue('recipient_phone', extracted.recipient_phone, { shouldValidate: true })
      if (extracted.recipient_address) setValue('recipient_address', extracted.recipient_address, { shouldValidate: true })
    },
    onError: () => {
      Alert.alert('Không đọc được ảnh', 'Vui lòng kiểm tra và nhập lại thông tin bên dưới.')
    },
  })

  const handleCapture = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync()
    if (!permission.granted) {
      Alert.alert('Cần quyền camera', 'Vui lòng cấp quyền camera để chụp ảnh đơn hàng.')
      return
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.6, allowsEditing: true, base64: true })
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0]
      setPhotoUri(asset.uri)
      if (asset.base64) {
        scanPhoto({ base64: asset.base64, mimeType: asset.mimeType })
      }
    }
  }

  const { mutate: createOrder, isPending: isSaving } = useMutation({
    mutationFn: (data: FormValues) => deliveryOrdersService.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['deliveryOrders'] })
      // `router.back()` unreliable here — add-delivery is a hidden tab
      // (`href: null`) inside the Tabs navigator, which doesn't keep a real
      // back stack, so it can land on the default tab (Home) instead of
      // dashboard. Same fixed-destination pattern as BackButton.tsx.
      router.replace('/dashboard')
    },
    onError: () => {
      Alert.alert('Không tạo được đơn', 'Vui lòng thử lại.')
    },
  })

  const onSubmit = (data: FormValues) => createOrder(data)

  return (
    <View flex={1} backgroundColor="$surface">
      <BackButton to="/dashboard" />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20, paddingTop: getBackButtonClearance(insets.top) + 16, paddingBottom: 100, gap: 20 }}
      >
        <Text fontSize="$6" fontWeight="800" color="$textPrimary">
          Thêm đơn giao hàng
        </Text>

        <TouchableOpacity onPress={handleCapture} activeOpacity={0.85} disabled={isScanning}>
          <GlassSurface cornerRadius={20} style={{ minHeight: 160 }}>
            <YStack flex={1} alignItems="center" justifyContent="center" padding="$4" gap="$2">
              {photoUri && (
                <Image source={{ uri: photoUri }} style={{ width: '100%', height: 160, borderRadius: 14 }} resizeMode="cover" />
              )}
              {isScanning && (
                <View
                  position="absolute"
                  top={0}
                  left={0}
                  right={0}
                  bottom={0}
                  alignItems="center"
                  justifyContent="center"
                  gap="$2"
                  backgroundColor="rgba(0,0,0,0.45)"
                  borderRadius={14}
                >
                  <ActivityIndicator size="small" color="#ffffff" />
                  <Text fontWeight="700" color="#ffffff" fontSize="$3">
                    Đang phân tích ảnh...
                  </Text>
                </View>
              )}
              {!photoUri && !isScanning && (
                <>
                  <View
                    width={56}
                    height={56}
                    borderRadius={28}
                    alignItems="center"
                    justifyContent="center"
                    backgroundColor="$primaryMuted"
                  >
                    <Ionicons name="camera" size={26} color="#7C5B9C" />
                  </View>
                  <Text fontWeight="700" color="$textPrimary" fontSize="$3">
                    Chụp ảnh đơn hàng
                  </Text>
                  <Text color="$textSecondary" fontSize={12} textAlign="center">
                    Chụp để AI tự điền thông tin bên dưới — tuỳ chọn
                  </Text>
                </>
              )}
            </YStack>
          </GlassSurface>
        </TouchableOpacity>
        {photoUri && !isScanning && (
          <TouchableOpacity onPress={() => setPhotoUri(undefined)} style={{ alignSelf: 'center' }}>
            <Text color="$danger" fontSize={13} fontWeight="600">
              Chụp lại
            </Text>
          </TouchableOpacity>
        )}

        <GlassSurface cornerRadius={20}>
          <YStack padding="$4" gap="$4">
            <Text fontWeight="700" color="$textPrimary" fontSize="$4">
              Người gửi
            </Text>
            <Controller
              name="sender_phone"
              control={control}
              render={({ field: { onChange, onBlur, value } }) => (
                <GlassAuthInput
                  label="Số điện thoại người gửi"
                  placeholder="09xxxxxxxx"
                  keyboardType="phone-pad"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.sender_phone?.message}
                />
              )}
            />
            <Controller
              name="sender_address"
              control={control}
              render={({ field: { onChange, onBlur, value } }) => (
                <GlassAuthInput
                  label="Địa chỉ gửi (nếu cần)"
                  placeholder="Số nhà, đường, phường/xã..."
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.sender_address?.message}
                />
              )}
            />
          </YStack>
        </GlassSurface>

        <GlassSurface cornerRadius={20}>
          <YStack padding="$4" gap="$4">
            <Text fontWeight="700" color="$textPrimary" fontSize="$4">
              Người nhận
            </Text>
            <Controller
              name="recipient_phone"
              control={control}
              render={({ field: { onChange, onBlur, value } }) => (
                <GlassAuthInput
                  label="Số điện thoại người nhận"
                  placeholder="09xxxxxxxx"
                  keyboardType="phone-pad"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.recipient_phone?.message}
                />
              )}
            />
            <Controller
              name="recipient_address"
              control={control}
              render={({ field: { onChange, onBlur, value } }) => (
                <GlassAuthInput
                  label="Địa chỉ nhận"
                  placeholder="Số nhà, đường, phường/xã..."
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.recipient_address?.message}
                />
              )}
            />
          </YStack>
        </GlassSurface>

        <GlassButton label="Thêm đơn hàng" onPress={handleSubmit(onSubmit)} loading={isSaving} />
      </ScrollView>
    </View>
  )
}
