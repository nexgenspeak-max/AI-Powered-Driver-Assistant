import { Linking, Pressable } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { XStack, YStack, View, useTheme } from 'tamagui'
import { Icon } from '../../../components/icons'
import { SolidCard } from '../../../components/SolidCard'
import { AppText } from '../../../components/AppText'
import { Button } from '../../../components/Button'
import { MAP_OVERLAY_BOTTOM_CLEARANCE } from '../../../constants'
import { formatKm, formatMinutes } from '../../../utils/format'
import type { NextStop } from '../hooks/useDriverMapModel'

// Bottom sheet-style card on the map home: WHERE the driver goes next, WHO
// is there, how far / how long, and the two actions that matter at the
// wheel — start turn-by-turn, or ring the customer. Mirrors the "next stop"
// card every major driver app (Grab, Be, Uber) keeps pinned over the map;
// before this the home map only had a bare navigate FAB and the driver had
// to switch to the Chuyến tab to learn what the FAB would navigate to.
export function NextStopCard({
  stop,
  totalStops,
  onNavigate,
}: {
  stop: NextStop
  totalStops: number
  onNavigate: () => void
}) {
  const insets = useSafeAreaInsets()
  const theme = useTheme()
  const isPickup = stop.kind === 'pickup'
  const accent = isPickup ? theme.primary.val : theme.success.val
  const kindLabel = !isPickup ? 'Trả khách' : stop.arrived ? 'Đã đến · chờ khách' : 'Đón khách'
  const km = formatKm(stop.distanceKm)
  const min = formatMinutes(stop.etaMinutes)
  const meta = [min, km].filter(Boolean).join(' · ')
  const phone = (stop.customerPhone || '').trim()

  return (
    <SolidCard
      cornerRadius={24}
      style={{
        position: 'absolute',
        left: 16,
        right: 16,
        bottom: insets.bottom + MAP_OVERLAY_BOTTOM_CLEARANCE,
      }}
    >
      <YStack padding="$4" gap="$3">
        <XStack alignItems="center" gap="$3">
          <View
            width={40}
            height={40}
            borderRadius={20}
            alignItems="center"
            justifyContent="center"
            backgroundColor={accent}
          >
            <Icon name={isPickup ? 'pin' : 'flag'} size={20} color={theme.textInverse.val} />
          </View>
          <YStack flex={1} gap={2}>
            <XStack alignItems="center" gap="$2">
              <AppText variant="label" color="$textSecondary">
                {kindLabel}
              </AppText>
              {totalStops > 1 ? (
                <AppText variant="caption" color="$textMuted">
                  · 1/{totalStops} điểm
                </AppText>
              ) : null}
            </XStack>
            <AppText variant="title" numberOfLines={1}>
              {stop.customerName || 'Khách'}
            </AppText>
          </YStack>
          {meta ? (
            <YStack alignItems="flex-end">
              <AppText variant="bodyStrong">{min || km}</AppText>
              {min && km ? (
                <AppText variant="caption" color="$textSecondary">
                  {km}
                </AppText>
              ) : null}
            </YStack>
          ) : null}
        </XStack>

        <AppText variant="body" color="$textSecondary" numberOfLines={2}>
          {stop.address}
        </AppText>

        <XStack gap="$3" alignItems="center">
          <Button
            label="Chỉ đường"
            variant="primary"
            full
            onPress={onNavigate}
            icon={<Icon name="navigate" size={18} color="#ffffff" />}
          />
          {phone ? (
            <Pressable
              onPress={() => Linking.openURL(`tel:${phone}`).catch(() => {})}
              accessibilityRole="button"
              accessibilityLabel={`Gọi ${stop.customerName || 'khách'}`}
              hitSlop={8}
              style={({ pressed }) => ({
                width: 52,
                height: 52,
                borderRadius: 26,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: theme.successContainer.val,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Icon name="phone" size={22} color={theme.onSuccessContainer.val} />
            </Pressable>
          ) : null}
        </XStack>
      </YStack>
    </SolidCard>
  )
}
