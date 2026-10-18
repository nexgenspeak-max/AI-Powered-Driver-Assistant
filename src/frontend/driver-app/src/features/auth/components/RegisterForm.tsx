import { useRef } from 'react'
import { ScrollView } from 'react-native'
import { YStack, useThemeName } from 'tamagui'
import { StatusBar } from 'expo-status-bar'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { router, Link } from 'expo-router'
import { KeyboardSafeView } from '../../../components/KeyboardSafeView'
import { AuthScreenBackground } from '../../../components/AuthScreenBackground'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { AuthHeader } from './AuthHeader'
import { GlassAuthInput } from '../../../components/GlassAuthInput'
import { GlassButton } from '../../../components/GlassButton'
import { Button } from '../../../components/Button'
import { Card } from '../../../components/Card'
import { AppText } from '../../../components/AppText'
import { useAuthStore } from '../../../stores/authStore'
import { authService } from '../../../services/api/auth'
import { authGlassTheme } from '../../../theme'
import { VehicleTypeSelect } from './VehicleTypeSelect'
import type { Driver } from '../../../types'

const schema = z.object({
  name: z.string().min(2, 'Tên tối thiểu 2 ký tự'),
  phone: z.string().min(8, 'Số điện thoại chưa hợp lệ'),
  email: z.string().email('Email chưa hợp lệ'),
  password: z.string().min(6, 'Mật khẩu tối thiểu 6 ký tự'),
  vehicle_type: z.string().min(1, 'Chọn loại xe'),
  vehicle_plate: z.string().min(3, 'Biển số chưa hợp lệ'),
  vehicle_name: z.string().min(2, 'Nhập tên xe'),
})
type FormValues = z.infer<typeof schema>

export function RegisterForm() {
  const setTokens = useAuthStore(s => s.setTokens)
  const queryClient = useQueryClient()

  const { control, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', phone: '', email: '', password: '', vehicle_type: '', vehicle_plate: '', vehicle_name: '' },
  })

  const controllerRef = useRef<AbortController | null>(null)

  const { mutate: register, isPending, isError, error, reset } = useMutation({
    mutationFn: (data: FormValues) => {
      const controller = new AbortController()
      controllerRef.current = controller
      return authService.register({ role: 'driver', ...data }, controller.signal)
    },
    onSuccess: ({ access_token, refresh_token, user }) => {
      setTokens(access_token, refresh_token)
      // register is the one auth call that still returns the profile (see
      // authService.ts) — priming useCurrentUser()'s ['me'] cache with it
      // directly skips the extra GET /auth/me round trip the very next
      // screen would otherwise make.
      const driver: Driver = {
        id: user.id,
        name: user.name,
        phone: user.phone ?? '',
        status: user.status === 'online' ? 'online' : 'offline',
        vehicle_type: user.vehicle_type,
        vehicle_plate: user.vehicle_plate,
        vehicle_name: user.vehicle_name,
        created_at: user.created_at,
        updated_at: user.updated_at,
      }
      queryClient.setQueryData(['me'], driver)
      router.replace('/(app)/')
    },
  })

  const onSubmit = (data: FormValues) => register(data)
  const onCancel = () => {
    controllerRef.current?.abort()
    reset()
  }
  const isLight = useThemeName() === 'light'
  const insets = useSafeAreaInsets()

  return (
    <>
      <StatusBar style={isLight ? 'dark' : 'light'} />
      <AuthScreenBackground>
        <KeyboardSafeView>
          <ScrollView
            style={{ flex: 1, backgroundColor: 'transparent' }}
            contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 20, paddingTop: insets.top + 8, paddingBottom: Math.max(insets.bottom, 24), gap: 24, width: '100%', maxWidth: authGlassTheme.card.maxWidth, alignSelf: 'center' }}
            keyboardShouldPersistTaps="handled"
          >
            <AuthHeader title="Trở thành tài xế Czen" subtitle="Vài thông tin về bạn và xe là xong." />

            <Card
              width="100%"
              maxWidth={authGlassTheme.card.maxWidth}
              gap="$4"
              shadowIntensity="strong"
              backgroundColor={isLight ? authGlassTheme.card.background.light : authGlassTheme.card.background.dark}
            >
              <Controller name="name" control={control} render={({ field: { onChange, onBlur, value } }) => (
                <GlassAuthInput label="Họ và tên" placeholder="Nguyễn Văn A"
                  value={value} onChangeText={onChange} onBlur={onBlur} error={errors.name?.message} />
              )} />
              <Controller name="phone" control={control} render={({ field: { onChange, onBlur, value } }) => (
                <GlassAuthInput label="Số điện thoại" placeholder="0901 234 567" keyboardType="phone-pad"
                  value={value} onChangeText={onChange} onBlur={onBlur} error={errors.phone?.message} />
              )} />
              <Controller name="email" control={control} render={({ field: { onChange, onBlur, value } }) => (
                <GlassAuthInput label="Email" placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none"
                  value={value} onChangeText={onChange} onBlur={onBlur} error={errors.email?.message} />
              )} />
              <Controller name="password" control={control} render={({ field: { onChange, onBlur, value } }) => (
                <GlassAuthInput label="Mật khẩu" secureTextEntry
                  value={value} onChangeText={onChange} onBlur={onBlur} error={errors.password?.message} />
              )} />
              <Controller name="vehicle_type" control={control} render={({ field: { onChange, value } }) => (
                <VehicleTypeSelect value={value} onChange={onChange} error={errors.vehicle_type?.message} />
              )} />
              <Controller name="vehicle_plate" control={control} render={({ field: { onChange, onBlur, value } }) => (
                <GlassAuthInput label="Biển số xe" placeholder="36C1-36363"
                  value={value} onChangeText={onChange} onBlur={onBlur} error={errors.vehicle_plate?.message} />
              )} />
              <Controller name="vehicle_name" control={control} render={({ field: { onChange, onBlur, value } }) => (
                <GlassAuthInput label="Tên xe" placeholder="Honda Wave"
                  value={value} onChangeText={onChange} onBlur={onBlur} error={errors.vehicle_name?.message} />
              )} />

              {isError && !axios.isCancel(error) && (
                <AppText variant="caption" color="$danger">
                  Đăng ký thất bại. Kiểm tra lại thông tin.
                </AppText>
              )}

              <GlassButton label="Đăng ký" colors={authGlassTheme.cta.gradient} onPress={handleSubmit(onSubmit)} loading={isPending} />
              {isPending && <Button label="Huỷ" variant="outline" onPress={onCancel} />}

              <AppText variant="body" textAlign="center" color="$textSecondary">
                Đã có tài khoản?{' '}
                <Link href="/login" style={{ color: authGlassTheme.linkColor, fontWeight: '600' }}>Đăng nhập</Link>
              </AppText>
            </Card>
          </ScrollView>
        </KeyboardSafeView>
      </AuthScreenBackground>
    </>
  )
}
