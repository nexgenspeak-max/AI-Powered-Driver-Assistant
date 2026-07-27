import { useState } from 'react'
import { ScrollView, TouchableOpacity, Image, Alert } from 'react-native'
import { View, YStack, XStack, Text, useTheme, useThemeName } from 'tamagui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import { GlassSurface } from '../../src/components/GlassSurface'
import { GlassAuthInput } from '../../src/components/GlassAuthInput'
import { GlassButton } from '../../src/components/GlassButton'
import { useDeliveryStore } from '../../src/stores/deliveryStore'

const schema = z.object({
  sender_phone: z.string().min(8, 'Vui lòng nhập số điện thoại người gửi'),
  sender_address: z.string().optional(),
  recipient_phone: z.string().min(8, 'Vui lòng nhập số điện thoại người nhận'),
  recipient_address: z.string().min(5, 'Vui lòng nhập địa chỉ nhận'),
})
type FormValues = z.infer<typeof schema>

export default function AddDeliveryScreen() {
  const insets = useSafeAreaInsets()
  const theme = useTheme()
  const isLight = useThemeName() === 'light'
  const addOrder = useDeliveryStore(s => s.addOrder)
  const [photoUri, setPhotoUri] = useState<string | undefined>()

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { sender_phone: '', sender_address: '', recipient_phone: '', recipient_address: '' },
  })

  const handleCapture = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync()
    if (!permission.granted) {
      Alert.alert('Cần quyền camera', 'Vui lòng cấp quyền camera để chụp ảnh đơn hàng.')
      return
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.6, allowsEditing: true })
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri)
    }
  }

  const onSubmit = (data: FormValues) => {
    addOrder({ ...data, photo_uri: photoUri })
    router.back()
  }

  return (
    <View flex={1} backgroundColor="$surface">
      <XStack
        alignItems="center"
        gap="$3"
        paddingHorizontal="$5"
        paddingTop={insets.top + 12}
        paddingBottom="$3"
      >
        <TouchableOpacity onPress={() => router.back()} hitSlop={10}>
          <View
            width={40}
            height={40}
            borderRadius={20}
            alignItems="center"
            justifyContent="center"
            backgroundColor={isLight ? '#F0EEF6' : 'rgba(255,255,255,0.08)'}
          >
            <Ionicons name="arrow-back" size={20} color={theme.textPrimary.val} />
          </View>
        </TouchableOpacity>
        <Text fontSize="$6" fontWeight="800" color="$textPrimary">
          Thêm đơn giao hàng
        </Text>
      </XStack>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20, paddingTop: 8, paddingBottom: 100, gap: 20 }}
      >
        <TouchableOpacity onPress={handleCapture} activeOpacity={0.85}>
          <GlassSurface cornerRadius={18} style={{ minHeight: 160 }}>
            <YStack flex={1} alignItems="center" justifyContent="center" padding="$4" gap="$2">
              {photoUri ? (
                <Image source={{ uri: photoUri }} style={{ width: '100%', height: 160, borderRadius: 14 }} resizeMode="cover" />
              ) : (
                <>
                  <View
                    width={56}
                    height={56}
                    borderRadius={28}
                    alignItems="center"
                    justifyContent="center"
                    backgroundColor="#EDE4FB"
                  >
                    <Ionicons name="camera" size={26} color="#7C3AED" />
                  </View>
                  <Text fontWeight="700" color="$textPrimary" fontSize="$3">
                    Chụp ảnh đơn hàng
                  </Text>
                  <Text color="$textSecondary" fontSize={12} textAlign="center">
                    Chụp nhanh để lưu kèm theo đơn — tuỳ chọn
                  </Text>
                </>
              )}
            </YStack>
          </GlassSurface>
        </TouchableOpacity>
        {photoUri && (
          <TouchableOpacity onPress={() => setPhotoUri(undefined)} style={{ alignSelf: 'center' }}>
            <Text color="$danger" fontSize={13} fontWeight="600">
              Chụp lại
            </Text>
          </TouchableOpacity>
        )}

        <GlassSurface cornerRadius={18}>
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

        <GlassSurface cornerRadius={18}>
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

        <GlassButton label="Thêm đơn hàng" onPress={handleSubmit(onSubmit)} />
      </ScrollView>
    </View>
  )
}
