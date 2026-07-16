import { styled, XStack, YStack, Text } from 'tamagui'
import { TouchableOpacity } from 'react-native'
import { Card } from '../../../components/Card'
import { formatCurrency } from '../../../utils/format'
import type { EarningsSummary } from '../../../types'

const TabFrame = styled(TouchableOpacity, {
  flex: 1,
  paddingVertical: '$2',
  borderRadius: '$control',
  alignItems: 'center',

  variants: {
    active: { true: { backgroundColor: '$surfaceElevated' } },
  } as const,
})

interface Props {
  period: 'week' | 'month'
  onPeriodChange: (period: 'week' | 'month') => void
  summary?: EarningsSummary
  isLoading: boolean
}

export function EarningsPeriodTabs({ period, onPeriodChange, summary, isLoading }: Props) {
  return (
    <Card gap="$3">
      <XStack backgroundColor="$surface" borderRadius="$control" padding="$1">
        {(['week', 'month'] as const).map(p => {
          const active = period === p
          return (
            <TabFrame key={p} active={active} onPress={() => onPeriodChange(p)}>
              <Text color={active ? '$textPrimary' : '$textSecondary'} fontWeight={active ? '600' : '400'}>
                {p === 'week' ? 'Last 7 days' : 'Last 30 days'}
              </Text>
            </TabFrame>
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
    </Card>
  )
}
