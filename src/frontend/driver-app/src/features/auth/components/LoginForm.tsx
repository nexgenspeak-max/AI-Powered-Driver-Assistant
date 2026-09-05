import { ScrollView } from 'react-native'
import { YStack, useThemeName } from 'tamagui'
import { StatusBar } from 'expo-status-bar'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { router, Link } from 'expo-router'
import { KeyboardSafeView } from '../../../components/KeyboardSafeView'
import { AuthScreenBackground } from '../../../components/AuthScreenBackground'
import { GlassAuthInput } from '../../../components/GlassAuthInput'
import { GlassButton } from '../../../components/GlassButton'
import { Card } from '../../../components/Card'
import { AppText } from '../../../components/AppText'
import { useAuthStore } from '../../../stores/authStore'
import { authService } from '../../../services/api/auth'
import { authGlassTheme } from '../../../theme'

const schema = z.object({
  phone: z.string().min(8, 'Số điện thoại chưa hợp lệ'),
  password: z.string().min(6, 'Mật khẩu tối thiểu 6 ký tự'),
})
type FormValues = z.infer<typeof schema>

export function LoginForm() {
  const setTokens = useAuthStore(s => s.setTokens)

  const { control, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { phone: '', password: '' },
  })

  const { mutate: login, isPending, isError } = useMutation({
    mutationFn: (data: FormValues) => authService.login({ role: 'driver', phone: data.phone, password: data.password }),
    onSuccess: ({ access_token, refresh_token }) => {
      // No profile in this response by design (see authService.ts) — fetched
      // separately via useCurrentUser() once inside (app).
      setTokens(access_token, refresh_token)
      router.replace('/')
    },
  })

  const onSubmit = (data: FormValues) => login(data)
  const isLight = useThemeName() === 'light'

  return (
    <>
      <StatusBar style={isLight ? 'dark' : 'light'} />
      <AuthScreenBackground>
        <KeyboardSafeView>
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
                Czen Driver
              </AppText>
              <AppText variant="body" color="$textSecondary">
                Đăng nhập để bắt đầu nhận chuyến
              </AppText>
            </YStack>

            <Card
              width="100%"
              maxWidth={authGlassTheme.card.maxWidth}
              gap="$4"
              shadowIntensity="strong"
              backgroundColor={isLight ? authGlassTheme.card.background.light : authGlassTheme.card.background.dark}
            >
              <Controller name="phone" control={control} render={({ field: { onChange, onBlur, value } }) => (
                <GlassAuthInput label="Số điện thoại" placeholder="+84901234567" keyboardType="phone-pad"
                  value={value} onChangeText={onChange} onBlur={onBlur} error={errors.phone?.message} />
              )} />
              <Controller name="password" control={control} render={({ field: { onChange, onBlur, value } }) => (
                <GlassAuthInput label="Mật khẩu" secureTextEntry
                  value={value} onChangeText={onChange} onBlur={onBlur} error={errors.password?.message} />
              )} />

              {isError && (
                <AppText variant="caption" color="$danger">
                  Đăng nhập thất bại. Kiểm tra lại thông tin.
                </AppText>
              )}

              <GlassButton label="Đăng nhập" colors={authGlassTheme.cta.gradient} onPress={handleSubmit(onSubmit)} loading={isPending} />

              <AppText variant="body" textAlign="center" color="$textSecondary">
                Chưa có tài khoản?{' '}
                <Link href="/register" style={{ color: authGlassTheme.linkColor, fontWeight: '600' }}>Đăng ký</Link>
              </AppText>
              <AppText variant="caption" textAlign="center" color="$textMuted">
                <Link href="/(auth)" style={{ color: authGlassTheme.linkColor }}>← Quay lại</Link>
              </AppText>
            </Card>
          </ScrollView>
        </KeyboardSafeView>
      </AuthScreenBackground>
    </>
  )
}
