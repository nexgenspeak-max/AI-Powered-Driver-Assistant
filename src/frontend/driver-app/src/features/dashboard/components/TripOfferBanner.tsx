import { useEffect, useRef } from 'react'
import { StyleSheet } from 'react-native'
import { XStack, YStack } from 'tamagui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { GestureDetector, Gesture } from 'react-native-gesture-handler'
import Animated, {
  FadeInDown,
  FadeOutUp,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated'
import { useAudioPlayer, setAudioModeAsync } from 'expo-audio'
import * as Haptics from 'expo-haptics'
import { GlassPanel } from '../../../components/GlassPanel'
import { AppText } from '../../../components/AppText'
import { RouteLine } from '../../../components/RouteLine'
import { Badge } from '../../../components/Badge'
import { Button } from '../../../components/Button'
import { tripsService } from '../../../services/api/trips'
import { pushImmediateLocation } from '../../../services/location/pushImmediateLocation'
import { confirmDestructive } from '../../../utils/confirmDialog'
import { useTripOfferStore } from '../../../stores/tripOfferStore'
import { useCurrentUser } from '../../auth/hooks/useCurrentUser'
import { TRIP_STATUS_LABELS, TRIP_STATUS_COLORS } from '../../../constants/status'

// Same recorded-cue approach as AssistantChatPanel.tsx's connecting cue —
// a real audio file, not device TTS, so it fires instantly regardless of
// LiveKit/voice session state.
const newTripAlertAsset = require('../../../../assets/audio/new-trip-alert.mp3')

// Floating "you have a new trip" card — mounted once in app/(app)/_layout.tsx
// (alongside GlobalAssistantOrb) so it's visible on every tab, not just
// Dashboard, since useDispatchSocket.ts's WebSocket connection now lives at
// that same layout level. Shows the exact same Accept/Reject actions as
// TripCard.tsx's inline buttons (same mutations, same PATCH calls) — this is
// just a more attention-grabbing surface for the same thing.
export function TripOfferBanner() {
  const insets = useSafeAreaInsets()
  const qc = useQueryClient()
  const tripId = useTripOfferStore(s => s.tripId)
  const dismiss = useTripOfferStore(s => s.dismiss)
  const { data: driver } = useCurrentUser()
  const alertPlayer = useAudioPlayer(newTripAlertAsset)
  const alertedTripId = useRef<string | null>(null)

  // Sound + haptic fire once per new offer (keyed on tripId, not on every
  // re-render) — as soon as the store shows a trip, not gated on the
  // GET /trips/:id fetch below finishing, so the driver gets the alert
  // instantly like Grab/Be's "ting" rather than after a network round-trip.
  //
  // Resets the "already alerted" ref the moment the banner goes away
  // (tripId back to null) — trip_id never changes for the life of a trip,
  // so if this same trip gets re-offered to this same driver later (e.g.
  // the customer's "Đặt lại chuyến" after a rejection happens to pick this
  // driver again), the ref must not still remember it as "already alerted"
  // from the first offer, or the second one would silently play nothing.
  useEffect(() => {
    if (!tripId) {
      alertedTripId.current = null
      return
    }
    if (alertedTripId.current === tripId) return
    alertedTripId.current = tripId
    ;(async () => {
      try {
        // Drivers commonly keep the phone on silent/vibrate — without this
        // the alert would be muted exactly when it matters most.
        await setAudioModeAsync({
          playsInSilentMode: true,
          interruptionMode: 'mixWithOthers',
          // Must stay true — omitting this defaults recording off on iOS and
          // kills LiveKit mic uplink for the next assistant session.
          allowsRecording: true,
        })
        console.log('[new-trip-alert] audio mode set, isLoaded=', alertPlayer.isLoaded, 'duration=', alertPlayer.duration)
        // A fresh player (never played yet, still finishing its initial
        // load) already sits at position 0 — calling seekTo(0) on it anyway
        // lands right in the middle of that load/decode pipeline and can
        // silently break the very first play (see AssistantChatPanel.tsx's
        // connecting-cue comment for the same bug, found and fixed there
        // first). Only a *replay* (currentTime already nonzero) needs a
        // real seek-back.
        if (alertPlayer.currentTime !== 0) alertPlayer.seekTo(0)
        alertPlayer.loop = false
        alertPlayer.volume = 1.0
        alertPlayer.play()
        console.log('[new-trip-alert] play() called')
      } catch (err) {
        console.warn('[TripOfferBanner] failed to play new-trip alert', err)
      }
    })()
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {})
  }, [tripId, alertPlayer])

  const { data: trip } = useQuery({
    queryKey: ['trip-offer', tripId],
    queryFn: () => tripsService.get(tripId!),
    enabled: !!tripId,
    // Stale-offer dismiss comes from schedule_updated invalidating this
    // query — no interval poll while the banner is up.
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['driverContext'] })
  const { mutate: accept, isPending: accepting } = useMutation({
    mutationFn: () => {
      // Fired in parallel, not awaited — see pushImmediateLocation.ts.
      pushImmediateLocation()
      return tripsService.accept(tripId!)
    },
    onSuccess: () => {
      invalidate()
      dismiss()
    },
  })
  const { mutate: reject, isPending: rejecting } = useMutation({
    mutationFn: () => tripsService.reject(tripId!),
    onSuccess: () => {
      invalidate()
      dismiss()
    },
  })

  // Auto-dismiss once this offer is no longer live for this driver — accepted/
  // rejected by an action here still goes through the mutations' onSuccess
  // above; this covers it going stale from *outside* this component (offer
  // timeout reassigned it, or another session already answered).
  useEffect(() => {
    if (!trip || !driver) return
    const stillOffered =
      (trip.status === 'notified' || trip.status === 'calling') && trip.driver_phone === driver.phone
    if (!stillOffered) dismiss()
  }, [trip, driver, dismiss])

  // Swipe-up-to-dismiss — follows the finger 1:1 (translateY + fading opacity)
  // rather than a fixed-duration animation, so it reads as physically dragged
  // away instead of just triggered by the gesture. Same "purely local
  // dismiss" as the "Để sau" text below (no API call, trip stays
  // notified/calling server-side) — swiping is just a faster gesture for the
  // exact same action, not a reject.
  const translateY = useSharedValue(0)
  const DISMISS_DISTANCE = -80
  const OFFSCREEN_DISTANCE = -400

  // Guards against a stale drag offset carrying over if a new offer replaces
  // this one while the shared value wasn't already back at 0 (e.g. the
  // auto-dismiss effect above fires mid-drag).
  useEffect(() => {
    translateY.value = 0
  }, [tripId, translateY])

  const panGesture = Gesture.Pan()
    .activeOffsetY(-10)
    .onChange(event => {
      // Clamp at 0 — dragging down does nothing, only up drags it away.
      translateY.value = Math.min(0, translateY.value + event.changeY)
    })
    .onEnd(event => {
      const pastThreshold = translateY.value < DISMISS_DISTANCE || event.velocityY < -800
      if (pastThreshold) {
        translateY.value = withTiming(OFFSCREEN_DISTANCE, { duration: 180 }, finished => {
          if (finished) runOnJS(dismiss)()
        })
      } else {
        translateY.value = withSpring(0, { damping: 18, stiffness: 220 })
      }
    })

  const dragStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: interpolate(translateY.value, [DISMISS_DISTANCE, 0], [0, 1], Extrapolation.CLAMP),
  }))

  const confirmReject = () => {
    confirmDestructive({
      title: 'Từ chối chuyến này?',
      message: 'Bạn sẽ không thể nhận lại chuyến này sau khi từ chối.',
      cancelLabel: 'Giữ lại',
      confirmLabel: 'Từ chối',
      onConfirm: () => reject(),
    })
  }

  if (!tripId || !trip) return null

  const statusColor = TRIP_STATUS_COLORS[trip.status]

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View
        entering={FadeInDown.duration(220)}
        exiting={FadeOutUp.duration(180)}
        style={[styles.wrap, { top: insets.top + 12 }, dragStyle]}
      >
        <GlassPanel borderRadius={24} style={{ width: '100%' }}>
          <YStack gap="$3" padding="$4">
            <XStack alignItems="center" justifyContent="space-between">
              <AppText variant="h2">Chuyến mới!</AppText>
              <Badge label={TRIP_STATUS_LABELS[trip.status]} backgroundColor={statusColor.bg} color={statusColor.text} glass={false} />
            </XStack>

            <AppText variant="bodyStrong">{trip.customer_name}</AppText>
            <RouteLine pickup={trip.pickup_address} dropoff={trip.dropoff_address} />

            <XStack gap="$3">
              <Button label="Từ chối" variant="outline" onPress={confirmReject} loading={rejecting} full />
              <Button label="Nhận chuyến" variant="primary" onPress={() => accept()} loading={accepting} full />
            </XStack>

            {/* Purely local dismiss — no API call, trip stays notified/calling
                server-side. The driver can still find/accept it later from
                Dashboard's own TripCard list. */}
            <AppText
              variant="bodyStrong"
              textAlign="center"
              onPress={dismiss}
              pressStyle={{ opacity: 0.6 }}
              paddingVertical="$3"
              accessibilityRole="button"
              accessibilityLabel="Để sau"
            >
              Để sau
            </AppText>
          </YStack>
        </GlassPanel>
      </Animated.View>
    </GestureDetector>
  )
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 70,
    elevation: 70,
  },
})
