import { ScrollView, StyleSheet } from 'react-native'
import { View, Text, useThemeName } from 'tamagui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { router } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import { GlassBookingInput } from './GlassBookingInput'
import { GlassButton } from '../../../components/GlassButton'
import { Card } from '../../../components/Card'
import { useBookTrip } from '../../trips/hooks/useBookTrip'

// Literal per-screen background, matching the trips screen's approach
// (features/trips/components/TripHistoryList.tsx) — dark mode locked to the
// exact reference hex rather than the shared `$surface` token, since the
// glass fields/button below were tuned against this specific backdrop.
// Light is a gradient per the Shutterstock reference (#F4F4F6 -> #E2E2E6).
const DARK_SCREEN_BACKGROUND = '#15111F'
const LIGHT_SCREEN_GRADIENT = ['#F4F4F6', '#E2E2E6'] as const
// Card container barely lifts off the page in dark mode — definition comes
// from the fields' own shadows/rims, not a visibly lighter card panel.
// Light mode needs a real translucent white wash (Card's own opaque
// $surfaceElevated would otherwise fully hide the gradient page behind it).
const FORM_CARD_BACKGROUND = { dark: 'rgba(255,255,255,0.03)', light: 'rgba(255,255,255,0.6)' }

const schema = z.object({
  customer_name: z.string().min(2, 'Name required'),
  customer_phone: z.string().min(8, 'Valid phone required'),
  pickup_address: z.string().min(5, 'Pickup address required'),
  dropoff_address: z.string().min(5, 'Dropoff address required'),
})
type FormValues = z.infer<typeof schema>

export function BookingForm() {
  const { mutate: book, isPending, isError } = useBookTrip()

  const { control, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { customer_name: '', customer_phone: '', pickup_address: '', dropoff_address: '' },
  })

  const onSubmit = (data: FormValues) => {
    book(data, { onSuccess: trip => router.push(`/trip/${trip.trip_id}`) })
  }
  const isLight = useThemeName() === 'light'
  const insets = useSafeAreaInsets()

  return (
    <View flex={1}>
      {isLight ? (
        <LinearGradient colors={LIGHT_SCREEN_GRADIENT} style={StyleSheet.absoluteFillObject} />
      ) : (
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: DARK_SCREEN_BACKGROUND }]} />
      )}
      <ScrollView
        style={{ flex: 1, backgroundColor: 'transparent' }}
        contentContainerStyle={{ padding: 20, paddingTop: insets.top + 16, paddingBottom: 100, gap: 20 }}
      >
      <View>
        {/* $textPrimary (#111827) is already near-black, but next to this
            screen's light gradient background it reads as "gray" by
            simultaneous contrast — same fix/reasoning as
            VoiceEnrollPanel's title. Pure black for light mode only, dark
            mode keeps the theme token. */}
        <Text fontSize="$7" fontWeight="800" color={isLight ? '#000000' : '$textPrimary'}>
          Book a Ride
        </Text>
        <Text color="$textSecondary" fontSize="$3" marginTop="$1">
          Enter your trip details below
        </Text>
      </View>

     <Card
  gap="$4"
  backgroundColor={isLight ? FORM_CARD_BACKGROUND.light : FORM_CARD_BACKGROUND.dark}
  style={{ borderRadius: 16, padding: 20 }}
>
  <View style={{ borderRadius: 16, overflow: 'hidden' }}>
    <Controller
      name="customer_name"
      control={control}
      render={({ field: { onChange, onBlur, value } }) => (
        <GlassBookingInput
          label="Your name"
          value={value}
          onChangeText={onChange}
          onBlur={onBlur}
          error={errors.customer_name?.message}
        />
      )}
    />
  </View>

  <View style={{ borderRadius: 16, overflow: 'hidden' }}>
    <Controller
      name="customer_phone"
      control={control}
      render={({ field: { onChange, onBlur, value } }) => (
        <GlassBookingInput
          label="Phone number"
          keyboardType="phone-pad"
          value={value}
          onChangeText={onChange}
          onBlur={onBlur}
          error={errors.customer_phone?.message}
        />
      )}
    />
  </View>

  <View style={{ borderRadius: 16, overflow: 'hidden' }}>
    <Controller
      name="pickup_address"
      control={control}
      render={({ field: { onChange, onBlur, value } }) => (
        <GlassBookingInput
          label="Pickup address"
          value={value}
          onChangeText={onChange}
          onBlur={onBlur}
          error={errors.pickup_address?.message}
        />
      )}
    />
  </View>

  <View style={{ borderRadius: 16, overflow: 'hidden' }}>
    <Controller
      name="dropoff_address"
      control={control}
      render={({ field: { onChange, onBlur, value } }) => (
        <GlassBookingInput
          label="Dropoff address"
          value={value}
          onChangeText={onChange}
          onBlur={onBlur}
          error={errors.dropoff_address?.message}
        />
      )}
    />
  </View>

  {isError && (
    <Text color="$danger" fontSize="$1">
      Failed to book. Please try again.
    </Text>
  )}

  <GlassButton
    label="Book Now"
    onPress={handleSubmit(onSubmit)}
    loading={isPending}
  />
</Card>
      </ScrollView>
    </View>
  )
}
