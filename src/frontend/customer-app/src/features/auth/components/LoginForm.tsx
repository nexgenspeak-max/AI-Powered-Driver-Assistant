import { View, Text } from 'react-native'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { router, Link } from 'expo-router'
import { Input } from '../../../components/Input'
import { Button } from '../../../components/Button'
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
    <View className="flex-1 bg-dark items-center justify-center p-6 gap-6">
      <View className="items-center gap-2">
        <Text className="text-white text-2xl font-extrabold">Welcome back</Text>
        <Text className="text-gray-300 text-sm">Log in to book your next ride</Text>
      </View>

      <View className="w-full max-w-sm bg-white rounded-3xl p-6 gap-4">
        <Controller name="phone" control={control} render={({ field: { onChange, onBlur, value } }) => (
          <Input label="Phone number" placeholder="+84901234567" keyboardType="phone-pad"
            value={value} onChangeText={onChange} onBlur={onBlur} error={errors.phone?.message} />
        )} />
        <Controller name="password" control={control} render={({ field: { onChange, onBlur, value } }) => (
          <Input label="Password" secureTextEntry
            value={value} onChangeText={onChange} onBlur={onBlur} error={errors.password?.message} />
        )} />

        {isError && <Text className="text-red-500 text-xs">Login failed. Check your details.</Text>}

        <Button label="Log In" onPress={handleSubmit(onSubmit)} loading={isPending} full />

        <Text className="text-center text-gray-500 text-sm">
          Don't have an account?{' '}
          <Link href="/register" className="text-primary font-semibold">Sign up</Link>
        </Text>
      </View>
    </View>
  )
}
