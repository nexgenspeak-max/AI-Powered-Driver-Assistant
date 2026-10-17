import { useEffect, useRef, useState } from 'react'
import { Pressable, StyleSheet } from 'react-native'
import { XStack, YStack, View, useTheme, useThemeName } from 'tamagui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated'
import { useAudioPlayer, setAudioModeAsync } from 'expo-audio'
import Svg, { Circle } from 'react-native-svg'
import { Ionicons } from '@expo/vector-icons'
import { AppText } from '../../../components/AppText'
import { RouteLine } from '../../../components/RouteLine'
import { Button } from '../../../components/Button'
import { TripMetaRow } from './TripMetaRow'
import { tripsService } from '../../../services/api/trips'
import { pushImmediateLocation } from '../../../services/location/pushImmediateLocation'
import { useTripOfferStore } from '../../../stores/tripOfferStore'
import { useCurrentUser } from '../../auth/hooks/useCurrentUser'
import { useVoiceSessionStore } from '../../home/stores/voiceSessionStore'
import { formatCurrency } from '../../../utils/format'
import { haptics } from '../../../utils/haptics'
import type { Trip } from '../../../types'

const newTripAlertAsset = require('../../../../assets/audio/new-trip-alert.mp3')

// How long the sheet stays up before it auto-dismisses locally. The trip
// itself stays `notified` server-side and remains in the Chờ list — this is
// the "decide now" window every driver app gives (Grab/Be ≈ 15–30 s), not a
// server-side expiry.
const OFFER_SECONDS = 20
const RING_SIZE = 148
const RING_STROKE = 8

// Grab-style full-screen trip offer: fare first (the number drivers decide
// on), a countdown ring around it, then km · min · pickup time, the rider,
// the route, and one big Nhận chuyến. Replaces the small top banner that
// hid the fare and competed with whatever screen was underneath.
export function TripOfferSheet() {
  const insets = useSafeAreaInsets()
  const theme = useTheme()
  const isLight = useThemeName() === 'light'
  const qc = useQueryClient()
  const tripId = useTripOfferStore(s => s.tripId)
  const dismiss = useTripOfferStore(s => s.dismiss)
  const voiceStatus = useVoiceSessionStore(s => s.status)
  const { data: driver } = useCurrentUser()
  const alertPlayer = useAudioPlayer(newTripAlertAsset)
  const alertedTripId = useRef<string | null>(null)
  const [secondsLeft, setSecondsLeft] = useState(OFFER_SECONDS)

  // Sound + haptic once per offer (see git history of TripOfferBanner for the
  // audio-session reasoning: never fight LiveKit mid-connect, keep
  // allowsRecording on so the next voice session still has a mic).
  useEffect(() => {
    if (!tripId) {
      alertedTripId.current = null
      return
    }
    if (alertedTripId.current === tripId) return
    alertedTripId.current = tripId
    haptics.success()
    if (voiceStatus === 'connecting' || voiceStatus === 'connected') return
    ;(async () => {
      try {
        await setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'mixWithOthers', allowsRecording: true })
        if (alertPlayer.currentTime !== 0) alertPlayer.seekTo(0)
        alertPlayer.loop = false
        alertPlayer.volume = 1.0
        alertPlayer.play()
      } catch (err) {
        console.warn('[TripOfferSheet] alert failed', err)
      }
    })()
  }, [tripId, alertPlayer, voiceStatus])

  // Countdown — resets per offer, dismisses locally at zero.
  useEffect(() => {
    if (!tripId) return
    setSecondsLeft(OFFER_SECONDS)
    const started = Date.now()
    const id = setInterval(() => {
      const left = OFFER_SECONDS - Math.floor((Date.now() - started) / 1000)
      if (left <= 0) {
        clearInterval(id)
        dismiss()
        return
      }
      setSecondsLeft(left)
    }, 250)
    return () => clearInterval(id)
  }, [tripId, dismiss])

  const { data: trip } = useQuery({
    queryKey: ['trip-offer', tripId],
    queryFn: () => tripsService.get(tripId!),
    enabled: !!tripId,
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['driverContext'] })
  const { mutate: accept, isPending: accepting } = useMutation({
    mutationFn: () => {
      pushImmediateLocation()
      return tripsService.accept(tripId!)
    },
    onSuccess: () => {
      haptics.success()
      invalidate()
      dismiss()
    },
    onError: () => haptics.error(),
  })
  const { mutate: reject, isPending: rejecting } = useMutation({
    mutationFn: () => tripsService.reject(tripId!),
    onSuccess: () => {
      invalidate()
      dismiss()
    },
  })

  // Auto-dismiss once the offer is no longer live for this driver (timed out
  // server-side, reassigned, or answered from another session).
  useEffect(() => {
    if (!trip || !driver) return
    const stillOffered = (trip.status === 'notified' || trip.status === 'calling') && trip.driver_phone === driver.phone
    if (!stillOffered) dismiss()
  }, [trip, driver, dismiss])

  if (!tripId || !trip) return null

  const fare = (trip as Trip & { estimated_fare?: number }).estimated_fare
  const progress = secondsLeft / OFFER_SECONDS
  const r = (RING_SIZE - RING_STROKE) / 2
  const circumference = 2 * Math.PI * r

  return (
    <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(150)} style={styles.backdrop}>
      <Pressable style={StyleSheet.absoluteFill} onPress={dismiss} accessibilityLabel="Để sau" />
      <Animated.View
        entering={SlideInDown.springify().damping(18).stiffness(180)}
        exiting={SlideOutDown.duration(200)}
        style={[styles.sheet, { backgroundColor: theme.surfaceElevated.val, paddingBottom: insets.bottom + 16 }]}
      >
        <View alignSelf="center" width={40} height={4} borderRadius={2} backgroundColor="$borderStrong" marginBottom="$3" />

        <XStack alignItems="center" justifyContent="space-between">
          <AppText variant="h2">Chuyến mới</AppText>
          <AppText variant="label" color="$textSecondary">
            Còn {secondsLeft}s
          </AppText>
        </XStack>

        <YStack alignItems="center" marginVertical="$3">
          <View width={RING_SIZE} height={RING_SIZE} alignItems="center" justifyContent="center">
            <Svg width={RING_SIZE} height={RING_SIZE} style={StyleSheet.absoluteFill}>
              <Circle cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={r} stroke={isLight ? '#EDE9FE' : '#2E2250'} strokeWidth={RING_STROKE} fill="none" />
              <Circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={r}
                stroke={theme.primary.val}
                strokeWidth={RING_STROKE}
                strokeLinecap="round"
                fill="none"
                strokeDasharray={`${circumference} ${circumference}`}
                strokeDashoffset={circumference * (1 - progress)}
                transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
              />
            </Svg>
            <AppText variant="label" color="$textSecondary">
              Cước ước tính
            </AppText>
            <AppText variant="display" numberOfLines={1} adjustsFontSizeToFit>
              {fare != null ? formatCurrency(fare) : '—'}
            </AppText>
          </View>
        </YStack>

        <YStack gap="$3">
          <TripMetaRow distanceKm={trip.distance_km} etaMinutes={trip.eta_minutes} pickupTime={trip.pickup_time} trafficNote={trip.traffic_note} />

          <XStack alignItems="center" gap="$3">
            <View width={40} height={40} borderRadius={20} backgroundColor="$primaryContainer" alignItems="center" justifyContent="center">
              <AppText variant="title" color="$onPrimaryContainer">
                {trip.customer_name?.trim().charAt(0).toUpperCase() || 'K'}
              </AppText>
            </View>
            <YStack flex={1}>
              <AppText variant="title" numberOfLines={1}>
                {trip.customer_name || 'Khách'}
              </AppText>
              {(trip.has_bulky_goods || trip.with_children) && (
                <AppText variant="caption" color="$textSecondary">
                  {[trip.has_bulky_goods ? 'Hàng cồng kềnh' : null, trip.with_children ? 'Có trẻ em' : null].filter(Boolean).join(' · ')}
                </AppText>
              )}
            </YStack>
            <Ionicons name="person-circle-outline" size={22} color={theme.textMuted.val} />
          </XStack>

          <RouteLine pickup={trip.pickup_address} dropoff={trip.dropoff_address} />
        </YStack>

        <YStack gap="$3" marginTop="$4">
          <Button label="Nhận chuyến" variant="primary" onPress={() => accept()} loading={accepting} full />
          <XStack gap="$3">
            <Button label="Để sau" variant="outline" onPress={dismiss} full />
            <Button label="Từ chối" variant="outline" onPress={() => reject()} loading={rejecting} full />
          </XStack>
        </YStack>
      </Animated.View>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10, 6, 20, 0.55)',
    justifyContent: 'flex-end',
    zIndex: 70,
    elevation: 70,
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
})
