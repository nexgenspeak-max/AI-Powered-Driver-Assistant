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
  name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().min(8, 'Valid phone required'),
  email: z.string().email('Valid email required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})
type FormValues = z.infer<typeof schema>

export function RegisterForm() {
  const setCustomer = useAuthStore(s => s.setCustomer)
  const setTokens = useAuthStore(s => s.setTokens)

  const { control, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', phone: '', email: '', password: '' },
  })

  const { mutate: register, isPending, isError } = useMutation({
    mutationFn: (data: FormValues) => authService.register({ role: 'customer', ...data }),
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

  const onSubmit = (data: FormValues) => register(data)

  return (
    <View className="flex-1 bg-dark items-center justify-center p-6 gap-6">
      <View className="items-center gap-2">
        <Text className="text-white text-2xl font-extrabold">Create account</Text>
        <Text className="text-gray-300 text-sm">Sign up to book your first ride</Text>
      </View>

      <View className="w-full max-w-sm bg-white rounded-3xl p-6 gap-4">
        <Controller name="name" control={control} render={({ field: { onChange, onBlur, value } }) => (
          <Input label="Full name" placeholder="Nguyễn Văn A"
            value={value} onChangeText={onChange} onBlur={onBlur} error={errors.name?.message} />
        )} />
        <Controller name="phone" control={control} render={({ field: { onChange, onBlur, value } }) => (
          <Input label="Phone number" placeholder="+84901234567" keyboardType="phone-pad"
            value={value} onChangeText={onChange} onBlur={onBlur} error={errors.phone?.message} />
        )} />
        <Controller name="email" control={control} render={({ field: { onChange, onBlur, value } }) => (
          <Input label="Email" placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none"
            value={value} onChangeText={onChange} onBlur={onBlur} error={errors.email?.message} />
        )} />
        <Controller name="password" control={control} render={({ field: { onChange, onBlur, value } }) => (
          <Input label="Password" secureTextEntry
            value={value} onChangeText={onChange} onBlur={onBlur} error={errors.password?.message} />
        )} />

        {isError && <Text className="text-red-500 text-xs">Registration failed. Check your details.</Text>}

        <Button label="Sign Up" onPress={handleSubmit(onSubmit)} loading={isPending} full />

        <Text className="text-center text-gray-500 text-sm">
          Already have an account?{' '}
          <Link href="/login" className="text-primary font-semibold">Log in</Link>
        </Text>
      </View>
    </View>
  )
}
