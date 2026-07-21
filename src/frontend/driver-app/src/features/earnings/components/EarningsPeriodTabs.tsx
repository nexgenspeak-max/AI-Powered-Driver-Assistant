import { XStack, YStack, Text, useThemeName } from 'tamagui'
import { TouchableOpacity } from 'react-native'
import { GlassSurface } from '../../../components/GlassSurface'
import { formatCurrency } from '../../../utils/format'
import type { EarningsSummary } from '../../../types'

// Small "raised" shadow for the active tab pill only — distinct from (and
// much lighter than) GlassSurface's own outer-card shadow, just enough to
// read as a slightly popped-up segment inside the track well.
function getActiveTabShadow(isLight: boolean) {
  return {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isLight ? 0.12 : 0.3,
    shadowRadius: 4,
    elevation: 2,
  } as const
}

const TRACK_RADIUS = 12

interface Props {
  period: 'week' | 'month'
  onPeriodChange: (period: 'week' | 'month') => void
  summary?: EarningsSummary
  isLoading: boolean
}

export function EarningsPeriodTabs({ period, onPeriodChange, summary, isLoading }: Props) {
  const isLight = useThemeName() === 'light'
  // Darker "well" than the card around it, per spec — a recessed track the
  // tabs sit inside of, not just a plain transparent row.
  const trackBackground = isLight ? 'rgba(0,0,0,0.06)' : 'rgba(0,0,0,0.28)'
  const activeTabBackground = isLight ? '#ffffff' : 'rgba(255,255,255,0.14)'

  return (
    <GlassSurface cornerRadius={18}>
      <YStack gap="$3" padding="$4">
        <XStack backgroundColor={trackBackground} borderRadius={TRACK_RADIUS} padding="$1">
          {(['week', 'month'] as const).map(p => {
            const active = period === p
            return (
              // Plain TouchableOpacity, not Tamagui's `styled(TouchableOpacity,
              // ...)` (the previous version here, and still how
              // VehicleTypeSelect.tsx does it) — confirmed via a live test that
              // wrapping TouchableOpacity through Tamagui's `styled()` silently
              // drops `onPress` on web (the element renders and receives the
              // click event fine, the handler just never runs). Every other
              // touchable added this session (GlassSurface, GlassBookButton,
              // GlassTripCard) already uses plain TouchableOpacity directly and
              // works, which is the actual reason for that convention.
              <TouchableOpacity
                key={p}
                onPress={() => onPeriodChange(p)}
                activeOpacity={0.8}
                style={[
                  { flex: 1, paddingVertical: 8, borderRadius: TRACK_RADIUS - 2, alignItems: 'center' },
                  { backgroundColor: active ? activeTabBackground : 'transparent' },
                  active ? getActiveTabShadow(isLight) : null,
                ]}
              >
                <Text color={active ? '$textPrimary' : '$textSecondary'} fontWeight={active ? '600' : '400'}>
                  {p === 'week' ? 'Last 7 days' : 'Last 30 days'}
                </Text>
              </TouchableOpacity>
            )
          })}
        </XStack>

        {isLoading || !summary ? (
          <Text color="$textSecondary" fontSize="$3">
            Loading...
          </Text>
        ) : (
          <YStack>
            <Text fontSize="$7" fontWeight="800" color="$textPrimary">
              {formatCurrency(summary.total_earnings, summary.currency)}
            </Text>
            <Text color="$textSecondary" fontSize="$3" marginTop="$1">
              {summary.trip_count} trips completed
            </Text>
          </YStack>
        )}
      </YStack>
    </GlassSurface>
  )
}
