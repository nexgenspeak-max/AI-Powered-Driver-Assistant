import { ScrollView } from 'react-native'
import { YStack, useThemeName } from 'tamagui'
import { StatusBar } from 'expo-status-bar'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { router, Link } from 'expo-router'
import { AuthScreenBackground } from '../../../components/AuthScreenBackground'
import { GlassAuthInput } from '../../../components/GlassAuthInput'
import { GlassButton } from '../../../components/GlassButton'
import { Card } from '../../../components/Card'
import { AppText } from '../../../components/AppText'
import { useAuthStore } from '../../../stores/authStore'
import { authService } from '../../../services/api/auth'
import { authGlassTheme } from '../../../theme'
import type { Customer } from '../../../types'

const schema = z.object({
  name: z.string().min(2, 'Tên tối thiểu 2 ký tự'),
  phone: z.string().min(8, 'Số điện thoại chưa hợp lệ'),
  email: z.string().email('Email chưa hợp lệ'),
  password: z.string().min(6, 'Mật khẩu tối thiểu 6 ký tự'),
})
type FormValues = z.infer<typeof schema>

export function RegisterForm() {
  const setTokens = useAuthStore(s => s.setTokens)
  const queryClient = useQueryClient()

  const { control, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', phone: '', email: '', password: '' },
  })

  const { mutate: register, isPending, isError } = useMutation({
    mutationFn: (data: FormValues) => authService.register({ role: 'customer', ...data }),
    onSuccess: ({ access_token, refresh_token, user }) => {
      setTokens(access_token, refresh_token)
      // register is the one auth call that still returns the profile (see
      // authService.ts) — priming useCurrentUser()'s ['me'] cache with it
      // directly skips the extra GET /auth/me round trip the very next
      // screen would otherwise make.
      const customer: Customer = {
        id: user.id,
        name: user.name,
        phone: user.phone ?? '',
        status: 'online',
        created_at: user.created_at,
        updated_at: user.updated_at,
      }
      queryClient.setQueryData(['me'], customer)
      authService.setStatus(user.id, 'online').catch(() => {})
      router.replace('/(app)/')
    },
  })

  const onSubmit = (data: FormValues) => register(data)
  const isLight = useThemeName() === 'light'

  return (
    <>
      <StatusBar style={isLight ? 'dark' : 'light'} />
      <AuthScreenBackground>
        <ScrollView
          style={{ flex: 1, backgroundColor: 'transparent' }}
          contentContainerStyle={{ flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 24 }}
          keyboardShouldPersistTaps="handled"
        >
          <YStack alignItems="center" gap="$2">
            <AppText
              variant="display"
              color={isLight ? authGlassTheme.titleColor.light : authGlassTheme.titleColor.dark}
            >
              Tạo tài khoản
            </AppText>
            <AppText variant="body" color="$textSecondary">
              Đăng ký để đặt chuyến đầu tiên
            </AppText>
          </YStack>

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
              <GlassAuthInput label="Số điện thoại" placeholder="+84901234567" keyboardType="phone-pad"
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

            {isError && (
              <AppText variant="caption" color="$danger">
                Đăng ký thất bại. Kiểm tra lại thông tin.
              </AppText>
            )}

            <GlassButton label="Đăng ký" colors={authGlassTheme.cta.gradient} onPress={handleSubmit(onSubmit)} loading={isPending} />

            <AppText variant="body" textAlign="center" color="$textSecondary">
              Đã có tài khoản?{' '}
              <Link href="/login" style={{ color: authGlassTheme.linkColor, fontWeight: '600' }}>Đăng nhập</Link>
            </AppText>
            <AppText variant="caption" textAlign="center" color="$textMuted">
              <Link href="/(auth)" style={{ color: authGlassTheme.linkColor }}>← Quay lại</Link>
            </AppText>
          </Card>
        </ScrollView>
      </AuthScreenBackground>
    </>
  )
}
