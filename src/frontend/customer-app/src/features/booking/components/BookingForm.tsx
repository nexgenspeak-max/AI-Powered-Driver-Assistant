import { ScrollView } from 'react-native'
import { View, Text, useTheme } from 'tamagui'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { router } from 'expo-router'
import { Input } from '../../../components/Input'
import { Button } from '../../../components/Button'
import { Card } from '../../../components/Card'
import { useBookTrip } from '../../trips/hooks/useBookTrip'
import { useBookingStore } from '../../../stores/bookingStore'

const schema = z.object({
  customer_name: z.string().min(2, 'Name required'),
  customer_phone: z.string().min(8, 'Valid phone required'),
  pickup_address: z.string().min(5, 'Pickup address required'),
  dropoff_address: z.string().min(5, 'Dropoff address required'),
})
type FormValues = z.infer<typeof schema>

export function BookingForm() {
  const activeTripId = useBookingStore(s => s.activeTripId)
  const { mutate: book, isPending, isError } = useBookTrip()

  const { control, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { customer_name: '', customer_phone: '', pickup_address: '', dropoff_address: '' },
  })

  const onSubmit = (data: FormValues) => {
    book(data, { onSuccess: trip => router.push(`/trip/${trip.trip_id}`) })
  }
  const theme = useTheme()

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.surface.val }}
      contentContainerStyle={{ padding: 20, paddingTop: 64, paddingBottom: 100, gap: 16 }}
    >
      <View>
        <Text fontSize="$7" fontWeight="800" color="$textPrimary">
          Book a Ride
        </Text>
        <Text color="$textSecondary" fontSize="$3" marginTop="$1">
          Enter your trip details below
        </Text>
      </View>

      {activeTripId && (
        <Card backgroundColor="$green4" borderColor="$green8">
          <Text color="$green11" fontSize="$3" onPress={() => router.push(`/trip/${activeTripId}`)}>
            You have an active trip. <Text textDecorationLine="underline" fontWeight="600">View status →</Text>
          </Text>
        </Card>
      )}

      <Card gap="$4">
        <Controller name="customer_name" control={control} render={({ field: { onChange, onBlur, value } }) => (
          <Input label="Your name" value={value} onChangeText={onChange} onBlur={onBlur} error={errors.customer_name?.message} />
        )} />
        <Controller name="customer_phone" control={control} render={({ field: { onChange, onBlur, value } }) => (
          <Input label="Phone number" keyboardType="phone-pad" value={value} onChangeText={onChange} onBlur={onBlur} error={errors.customer_phone?.message} />
        )} />
        <Controller name="pickup_address" control={control} render={({ field: { onChange, onBlur, value } }) => (
          <Input label="Pickup address" value={value} onChangeText={onChange} onBlur={onBlur} error={errors.pickup_address?.message} />
        )} />
        <Controller name="dropoff_address" control={control} render={({ field: { onChange, onBlur, value } }) => (
          <Input label="Dropoff address" value={value} onChangeText={onChange} onBlur={onBlur} error={errors.dropoff_address?.message} />
        )} />

        {isError && (
          <Text color="$danger" fontSize="$1">
            Failed to book. Please try again.
          </Text>
        )}

        <Button label="Book Now" onPress={handleSubmit(onSubmit)} loading={isPending} full />
      </Card>
    </ScrollView>
  )
}
