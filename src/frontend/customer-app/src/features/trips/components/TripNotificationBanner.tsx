import { useEffect } from 'react'
import { StyleSheet, TouchableOpacity } from 'react-native'
import { XStack, Text } from 'tamagui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated'
import { GlassSurface } from '../../../components/GlassSurface'
import { useTripNotificationStore } from '../../../stores/tripNotificationStore'

const AUTO_DISMISS_MS = 6000

const COPY = {
  trip_confirmed: {
    icon: 'checkmark-circle' as const,
    color: '#22C55E',
    text: 'Tài xế đã nhận chuyến của bạn!',
  },
  trip_rejected: {
    icon: 'close-circle' as const,
    color: '#EF4444',
    text: 'Tài xế đã từ chối chuyến. Vui lòng chọn tài xế khác.',
  },
}

// Mounted once in app/_layout.tsx so it's visible on every screen — the
// customer might be browsing elsewhere in the app when the driver they
// picked answers, not necessarily staring at the trip status screen.
export function TripNotificationBanner() {
  const insets = useSafeAreaInsets()
  const notification = useTripNotificationStore(s => s.notification)
  const dismiss = useTripNotificationStore(s => s.dismiss)

  useEffect(() => {
    if (!notification) return
    const timer = setTimeout(dismiss, AUTO_DISMISS_MS)
    return () => clearTimeout(timer)
  }, [notification, dismiss])

  if (!notification) return null
  const copy = COPY[notification.event]

  return (
    <Animated.View entering={FadeInDown.duration(220)} exiting={FadeOutUp.duration(180)} style={[styles.wrap, { top: insets.top + 12 }]}>
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => {
          dismiss()
          router.push(`/trip/${notification.tripId}`)
        }}
      >
        <GlassSurface cornerRadius={16} style={{ width: '100%' }}>
          <XStack alignItems="center" gap="$3" padding="$3">
            <Ionicons name={copy.icon} size={24} color={copy.color} />
            <Text flex={1} fontSize="$3" fontWeight="600" color="$textPrimary">
              {copy.text}
            </Text>
            <TouchableOpacity onPress={dismiss} hitSlop={10}>
              <Ionicons name="close" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          </XStack>
        </GlassSurface>
      </TouchableOpacity>
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
