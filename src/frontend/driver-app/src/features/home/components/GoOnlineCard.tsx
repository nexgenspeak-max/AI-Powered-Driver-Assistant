import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { XStack, YStack } from 'tamagui'
import { GlassPanel } from '../../../components/GlassPanel'
import { AppText } from '../../../components/AppText'
import { Button } from '../../../components/Button'
import { MAP_OVERLAY_BOTTOM_CLEARANCE } from '../../../constants'
import { formatCurrency } from '../../../utils/format'
import { useOnlineToggle } from '../../dashboard/hooks/useOnlineToggle'
import type { TodayEarnings } from '../../../types'

// Bottom card on the map when the driver is offline (and has nothing to
// drive to): today's figure for motivation + the one action that matters,
// going online. Replaces an empty map with no affordance at all.
export function GoOnlineCard({ today }: { today: TodayEarnings | null }) {
  const insets = useSafeAreaInsets()
  const { setOnline, pending, ready } = useOnlineToggle()

  return (
    <GlassPanel
      borderRadius={24}
      style={{ position: 'absolute', left: 16, right: 16, bottom: insets.bottom + MAP_OVERLAY_BOTTOM_CLEARANCE }}
    >
      <YStack padding="$4" gap="$3">
        <XStack alignItems="flex-end" justifyContent="space-between" gap="$3">
          <YStack gap={2} flex={1}>
            <AppText variant="label" color="$textSecondary">
              Hôm nay
            </AppText>
            <AppText variant="display" numberOfLines={1}>
              {formatCurrency(today?.total_earnings ?? 0, today?.currency ?? 'VND')}
            </AppText>
          </YStack>
          <AppText variant="label" color="$textSecondary">
            {today?.trip_count ?? 0} chuyến
          </AppText>
        </XStack>
        <Button
          label="Bật nhận chuyến"
          variant="primary"
          full
          loading={pending}
          disabled={!ready}
          onPress={() => setOnline(true)}
        />
      </YStack>
    </GlassPanel>
  )
}
