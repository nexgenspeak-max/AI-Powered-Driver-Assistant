import { YStack, Text, Theme } from 'tamagui'
import { StatusBar } from 'expo-status-bar'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { router, Link } from 'expo-router'
import { Input } from '../../../components/Input'
import { Button } from '../../../components/Button'
import { Card } from '../../../components/Card'
import { useAuthStore } from '../../../stores/authStore'
import { authService } from '../../../services/api/auth'

const schema = z.object({
  phone: z.string().min(8, 'Valid phone required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})
type FormValues = z.infer<typeof schema>

export function LoginForm() {
  const setCustomer = useAuthStore(s => s.setCustomer)
  const setTokens = useAuthStore(s => s.setTokens)

  const { control, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { phone: '', password: '' },
  })

  const { mutate: login, isPending, isError } = useMutation({
    mutationFn: (data: FormValues) => authService.login({ role: 'customer', phone: data.phone, password: data.password }),
    onSuccess: ({ access_token, refresh_token, user }) => {
      setTokens(access_token, refresh_token)
      setCustomer({
        id: user.id,
        name: user.name,
        phone: user.phone ?? '',
        status: 'online',
        created_at: user.created_at,
        updated_at: user.updated_at,
      })
      authService.setStatus(user.id, 'online').catch(() => {})
      router.replace('/')
    },
  })

  const onSubmit = (data: FormValues) => login(data)

  return (
    // Auth screens are always dark-branded regardless of the app-wide theme
    // toggle — force dark so nested tokens ($textSecondary, Input's
    // $surfaceElevated, etc.) don't flip to light-mode values.
    <Theme name="dark">
    <StatusBar style="light" />
    <YStack flex={1} backgroundColor="$dark" alignItems="center" justifyContent="center" padding="$6" gap="$6">
      <YStack alignItems="center" gap="$2">
        <Text color="$textInverse" fontSize="$7" fontWeight="800">
          Welcome back
        </Text>
        <Text color="#d1d5db" fontSize="$3">
          Log in to book your next ride
        </Text>
      </YStack>

      <Card width="100%" maxWidth={384} gap="$4">
        <Controller name="phone" control={control} render={({ field: { onChange, onBlur, value } }) => (
          <Input label="Phone number" placeholder="+84901234567" keyboardType="phone-pad"
            value={value} onChangeText={onChange} onBlur={onBlur} error={errors.phone?.message} />
        )} />
        <Controller name="password" control={control} render={({ field: { onChange, onBlur, value } }) => (
          <Input label="Password" secureTextEntry
            value={value} onChangeText={onChange} onBlur={onBlur} error={errors.password?.message} />
        )} />

        {isError && (
          <Text color="$danger" fontSize="$1">
            Login failed. Check your details.
          </Text>
        )}

        <Button label="Log In" onPress={handleSubmit(onSubmit)} loading={isPending} marginTop="$2" />

        <Text textAlign="center" color="$textSecondary" fontSize="$3">
          Don't have an account?{' '}
          <Link href="/register" style={{ color: '#6c8aff', fontWeight: '600' }}>Sign up</Link>
        </Text>
      </Card>
    </YStack>
    </Theme>
  )
}
