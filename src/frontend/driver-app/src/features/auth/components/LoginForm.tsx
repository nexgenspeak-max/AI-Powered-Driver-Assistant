import { YStack, Text, useThemeName } from 'tamagui'
import { StatusBar } from 'expo-status-bar'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { router, Link } from 'expo-router'
import { GlassAuthInput } from '../../../components/GlassAuthInput'
import { GlassButton } from '../../../components/GlassButton'
import { Card } from '../../../components/Card'
import { useAuthStore } from '../../../stores/authStore'
import { authService } from '../../../services/api/auth'
import { authGlassTheme } from '../../../theme'

const schema = z.object({
  phone: z.string().min(8, 'Valid phone required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
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
      // No profile in this response by design (see authService.ts) — the
      // driver's name/phone/vehicle/etc. is fetched separately via
      // useCurrentUser() once inside (app).
      setTokens(access_token, refresh_token)
      router.replace('/')
    },
  })

  const onSubmit = (data: FormValues) => login(data)
  const isLight = useThemeName() === 'light'

  return (
    <>
      <StatusBar style={isLight ? 'dark' : 'light'} />
      <YStack
        flex={1}
        backgroundColor={isLight ? authGlassTheme.screenBackground.light : authGlassTheme.screenBackground.dark}
        alignItems="center"
        justifyContent="center"
        padding="$6"
        gap="$6"
      >
        <YStack alignItems="center" gap="$2">
          <Text color={isLight ? authGlassTheme.titleColor.light : authGlassTheme.titleColor.dark} fontSize="$7" fontWeight="800">
            Czen Driver
          </Text>
          <Text color="$textSecondary" fontSize="$3">
            Log in to start receiving trips
          </Text>
        </YStack>

        <Card
          width="100%"
          maxWidth={authGlassTheme.card.maxWidth}
          gap="$4"
          shadowIntensity="strong"
          borderRadius={28}
          backgroundColor={isLight ? authGlassTheme.card.background.light : authGlassTheme.card.background.dark}
        >
          <Controller name="phone" control={control} render={({ field: { onChange, onBlur, value } }) => (
            <GlassAuthInput label="Phone number" placeholder="+84901234567" keyboardType="phone-pad"
              value={value} onChangeText={onChange} onBlur={onBlur} error={errors.phone?.message} />
          )} />
          <Controller name="password" control={control} render={({ field: { onChange, onBlur, value } }) => (
            <GlassAuthInput label="Password" secureTextEntry
              value={value} onChangeText={onChange} onBlur={onBlur} error={errors.password?.message} />
          )} />

          {isError && (
            <Text color="$danger" fontSize="$1">
              Login failed. Check your details.
            </Text>
          )}

          <GlassButton label="Đăng nhập" colors={authGlassTheme.cta.gradient} onPress={handleSubmit(onSubmit)} loading={isPending} />

          <Text textAlign="center" color="$textSecondary" fontSize="$3">
            Don't have an account?{' '}
            <Link href="/register" style={{ color: authGlassTheme.linkColor, fontWeight: '600' }}>Sign up</Link>
          </Text>
        </Card>
      </YStack>
    </>
  )
}
