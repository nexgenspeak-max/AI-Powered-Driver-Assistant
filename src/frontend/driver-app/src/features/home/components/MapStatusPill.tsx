import { Pressable } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { XStack, View, useTheme } from 'tamagui'
import { Ionicons } from '@expo/vector-icons'
import { GlassPanel } from '../../../components/GlassPanel'
import { AppText } from '../../../components/AppText'
import { TOP_OVERLAY_CLEARANCE } from '../../../constants'

// Top chrome on the map home: online state + active trip count on the
// left, a "my location" button on the right. Glass, so the map stays the
// hero; nothing here competes with the next-stop card at the bottom.
export function MapStatusPill({
  isOnline,
  activeTripCount,
  onRecenter,
}: {
  isOnline: boolean
  activeTripCount: number
  onRecenter: () => void
}) {
  const insets = useSafeAreaInsets()
  const theme = useTheme()
  const top = insets.top + TOP_OVERLAY_CLEARANCE

  return (
    <>
      <GlassPanel borderRadius={999} style={{ position: 'absolute', left: 16, top }}>
        <XStack alignItems="center" gap="$2" paddingVertical={8} paddingHorizontal={14}>
          <View
            width={8}
            height={8}
            borderRadius={4}
            backgroundColor={isOnline ? theme.success.val : theme.textMuted.val}
          />
          <AppText variant="label">{isOnline ? 'Đang nhận chuyến' : 'Đang nghỉ'}</AppText>
          {activeTripCount > 0 ? (
            <AppText variant="label" color="$textSecondary">
              · {activeTripCount} chuyến
            </AppText>
          ) : null}
        </XStack>
      </GlassPanel>

      <GlassPanel borderRadius={22} style={{ position: 'absolute', right: 16, top }}>
        <Pressable
          onPress={onRecenter}
          accessibilityRole="button"
          accessibilityLabel="Về vị trí của tôi"
          hitSlop={8}
          style={({ pressed }) => ({
            width: 44,
            height: 44,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <Ionicons name="locate" size={20} color={theme.primary.val} />
        </Pressable>
      </GlassPanel>
    </>
  )
}
