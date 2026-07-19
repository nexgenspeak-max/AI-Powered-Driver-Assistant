import { ScrollView } from 'react-native'
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
import { VehicleTypeSelect } from './VehicleTypeSelect'

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().min(8, 'Valid phone required'),
  email: z.string().email('Valid email required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  vehicle_type: z.string().min(1, 'Select a vehicle type'),
  vehicle_plate: z.string().min(3, 'Valid plate number required'),
  vehicle_name: z.string().min(2, 'Vehicle name required'),
})
type FormValues = z.infer<typeof schema>

export function RegisterForm() {
  const setDriver = useAuthStore(s => s.setDriver)
  const setTokens = useAuthStore(s => s.setTokens)

  const { control, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', phone: '', email: '', password: '', vehicle_type: '', vehicle_plate: '', vehicle_name: '' },
  })

  const { mutate: register, isPending, isError } = useMutation({
    mutationFn: (data: FormValues) => authService.register({ role: 'driver', ...data }),
    onSuccess: ({ access_token, refresh_token, user }) => {
      setTokens(access_token, refresh_token)
      setDriver({
        id: user.id,
        name: user.name,
        phone: user.phone ?? '',
        status: user.status === 'online' ? 'online' : 'offline',
        vehicle_type: user.vehicle_type,
        vehicle_plate: user.vehicle_plate,
        vehicle_name: user.vehicle_name,
        created_at: user.created_at,
        updated_at: user.updated_at,
      })
      router.replace('/')
    },
  })

  const onSubmit = (data: FormValues) => register(data)

  return (
    // Auth screens are always dark-branded regardless of the app-wide theme
    // toggle — force dark so nested tokens ($textSecondary, Input's
    // $surfaceElevated, etc.) don't flip to light-mode values.
    <Theme name="dark">
    <StatusBar style="light" />
    <ScrollView
      style={{ flex: 1, backgroundColor: '#1A1420' }}
      // Plain RN style object (no Tamagui token resolution) — 24 matches `$6` below.
      contentContainerStyle={{ alignItems: 'center', justifyContent: 'center', padding: 24, gap: 24 }}
    >
      <YStack alignItems="center" gap="$2" marginTop="$10">
        <Text color="$textInverse" fontSize="$7" fontWeight="800">
          Become a Driver
        </Text>
        <Text color="#d1d5db" fontSize="$3">
          Sign up to start earning with Czen
        </Text>
      </YStack>

      <Card width="100%" maxWidth={384} gap="$4">
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
        <Controller name="vehicle_type" control={control} render={({ field: { onChange, value } }) => (
          <VehicleTypeSelect value={value} onChange={onChange} error={errors.vehicle_type?.message} />
        )} />
        <Controller name="vehicle_plate" control={control} render={({ field: { onChange, onBlur, value } }) => (
          <Input label="Vehicle plate" placeholder="59A-12345"
            value={value} onChangeText={onChange} onBlur={onBlur} error={errors.vehicle_plate?.message} />
        )} />
        <Controller name="vehicle_name" control={control} render={({ field: { onChange, onBlur, value } }) => (
          <Input label="Vehicle name" placeholder="Honda Wave"
            value={value} onChangeText={onChange} onBlur={onBlur} error={errors.vehicle_name?.message} />
        )} />

        {isError && (
          <Text color="$danger" fontSize="$1">
            Registration failed. Check your details.
          </Text>
        )}

        <Button label="Sign Up" onPress={handleSubmit(onSubmit)} loading={isPending} full />

        <Text textAlign="center" color="$textSecondary" fontSize="$3">
          Already have an account?{' '}
          <Link href="/login" style={{ color: '#6c8aff', fontWeight: '600' }}>Log in</Link>
        </Text>
      </Card>
    </ScrollView>
    </Theme>
  )
}
