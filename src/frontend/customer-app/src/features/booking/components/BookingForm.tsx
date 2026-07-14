import { View, Text, ScrollView } from 'react-native'
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

  return (
    <ScrollView className="flex-1 bg-surface" contentContainerClassName="p-5 pt-16 gap-4">
      <View>
        <Text className="text-2xl font-extrabold text-gray-900">Book a Ride</Text>
        <Text className="text-gray-500 text-sm mt-1">Enter your trip details below</Text>
      </View>

      {activeTripId && (
        <Card className="bg-green-50 border-green-300">
          <Text className="text-green-800 text-sm" onPress={() => router.push(`/trip/${activeTripId}`)}>
            You have an active trip. <Text className="underline font-semibold">View status →</Text>
          </Text>
        </Card>
      )}

      <Card className="gap-4">
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

        {isError && <Text className="text-red-500 text-xs">Failed to book. Please try again.</Text>}

        <Button label="Book Now" onPress={handleSubmit(onSubmit)} loading={isPending} full />
      </Card>
    </ScrollView>
  )
}
