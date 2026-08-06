import { useEffect, useRef } from 'react'
import { StyleSheet } from 'react-native'
import { XStack, YStack, Text } from 'tamagui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated'
import { useAudioPlayer, setAudioModeAsync } from 'expo-audio'
import * as Haptics from 'expo-haptics'
import { GlassSurface } from '../../../components/GlassSurface'
import { Badge } from '../../../components/Badge'
import { Button } from '../../../components/Button'
import { InfoRow } from './InfoRow'
import { tripsService } from '../../../services/api/trips'
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
        await setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'mixWithOthers' })
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
    // Short poll while the banner is up — catches the trip being reassigned
    // elsewhere (another driver accepted first, or the 15s offer window
    // moved on) so a stale banner doesn't sit there promising a trip that's
    // no longer actually offered to this driver.
    refetchInterval: 4000,
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['driverContext'] })
  const { mutate: accept, isPending: accepting } = useMutation({
    mutationFn: () => tripsService.accept(tripId!),
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

  if (!tripId || !trip) return null

  const statusColor = TRIP_STATUS_COLORS[trip.status]

  return (
    <Animated.View
      entering={FadeInDown.duration(220)}
      exiting={FadeOutUp.duration(180)}
      style={[styles.wrap, { top: insets.top + 12 }]}
    >
      <GlassSurface cornerRadius={20} style={{ width: '100%' }}>
        <YStack padding="$4" gap="$3">
          <XStack alignItems="center" justifyContent="space-between">
            <Text fontWeight="700" fontSize="$4" color="$textPrimary">
              Chuyến mới!
            </Text>
            <Badge label={TRIP_STATUS_LABELS[trip.status]} backgroundColor={statusColor.bg} color={statusColor.text} glass={false} />
          </XStack>

          <YStack gap="$2">
            <InfoRow label="Khách" value={trip.customer_name} />
            <InfoRow label="Đón" value={trip.pickup_address} />
            <InfoRow label="Trả" value={trip.dropoff_address} />
          </YStack>

          <XStack gap="$3">
            <Button label="Không nhận chuyến" variant="outline" onPress={() => reject()} loading={rejecting} full />
            <Button label="Nhận chuyến" variant="primary" onPress={() => accept()} loading={accepting} full />
          </XStack>
        </YStack>
      </GlassSurface>
    </Animated.View>
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
