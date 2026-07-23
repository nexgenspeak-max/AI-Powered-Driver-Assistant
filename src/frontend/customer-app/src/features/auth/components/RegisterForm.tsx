import { ScrollView } from 'react-native'
import { YStack, Text, useThemeName } from 'tamagui'
import { StatusBar } from 'expo-status-bar'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { router, Link } from 'expo-router'
import { GlassAuthInput } from '../../../components/GlassAuthInput'
import { GlassButton } from '../../../components/GlassButton'
import { Card } from '../../../components/Card'
import { useAuthStore } from '../../../stores/authStore'
import { authService } from '../../../services/api/auth'
import { authGlassTheme } from '../../../theme'
import type { Customer } from '../../../types'

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().min(8, 'Valid phone required'),
  email: z.string().email('Valid email required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
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
      router.replace('/')
    },
  })

  const onSubmit = (data: FormValues) => register(data)
  const isLight = useThemeName() === 'light'

  return (
    <>
      <StatusBar style={isLight ? 'dark' : 'light'} />
      <ScrollView
        style={{ flex: 1, backgroundColor: isLight ? authGlassTheme.screenBackground.light : authGlassTheme.screenBackground.dark }}
        contentContainerStyle={{ alignItems: 'center', justifyContent: 'center', padding: 24, gap: 24 }}
      >
        <YStack alignItems="center" gap="$2" marginTop="$10">
          <Text color={isLight ? authGlassTheme.titleColor.light : authGlassTheme.titleColor.dark} fontSize="$7" fontWeight="800">
            Create account
          </Text>
          <Text color="$textSecondary" fontSize="$3">
            Sign up to book your first ride
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
          <Controller name="name" control={control} render={({ field: { onChange, onBlur, value } }) => (
            <GlassAuthInput label="Full name" placeholder="Nguyễn Văn A"
              value={value} onChangeText={onChange} onBlur={onBlur} error={errors.name?.message} />
          )} />
          <Controller name="phone" control={control} render={({ field: { onChange, onBlur, value } }) => (
            <GlassAuthInput label="Phone number" placeholder="+84901234567" keyboardType="phone-pad"
              value={value} onChangeText={onChange} onBlur={onBlur} error={errors.phone?.message} />
          )} />
          <Controller name="email" control={control} render={({ field: { onChange, onBlur, value } }) => (
            <GlassAuthInput label="Email" placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none"
              value={value} onChangeText={onChange} onBlur={onBlur} error={errors.email?.message} />
          )} />
          <Controller name="password" control={control} render={({ field: { onChange, onBlur, value } }) => (
            <GlassAuthInput label="Password" secureTextEntry
              value={value} onChangeText={onChange} onBlur={onBlur} error={errors.password?.message} />
          )} />

          {isError && (
            <Text color="$danger" fontSize="$1">
              Registration failed. Check your details.
            </Text>
          )}

          <GlassButton label="Đăng ký" colors={authGlassTheme.cta.gradient} onPress={handleSubmit(onSubmit)} loading={isPending} />

          <Text textAlign="center" color="$textSecondary" fontSize="$3">
            Already have an account?{' '}
            <Link href="/login" style={{ color: authGlassTheme.linkColor, fontWeight: '600' }}>Log in</Link>
          </Text>
        </Card>
      </ScrollView>
    </>
  )
}
