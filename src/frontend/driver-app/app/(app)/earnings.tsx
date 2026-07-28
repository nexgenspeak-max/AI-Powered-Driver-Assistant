import { useState } from 'react'
import { ScrollView, StyleSheet } from 'react-native'
import { View, YStack, Text, useThemeName } from 'tamagui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { useDriverContext } from '../../src/features/dashboard/hooks/useDriverContext'
import { useEarningsSummary } from '../../src/features/earnings/hooks/useEarningsSummary'
import { GlassSurface } from '../../src/components/GlassSurface'
import { TodayEarningsCard } from '../../src/features/earnings/components/TodayEarningsCard'
import { EarningsPeriodTabs } from '../../src/features/earnings/components/EarningsPeriodTabs'
import { BonusList } from '../../src/features/earnings/components/BonusList'

// Literal per-screen background — same treatment as the other screens'
// glass containers (customer-app trips/booking/profile), locked to the
// exact reference hex rather than the shared `$surface` token, since
// GlassSurface only shows up as a thin margin around the sheet below.
// Light is a gradient per the Shutterstock reference (#F4F4F6 -> #E2E2E6),
// dark stays the flat original.
const DARK_SCREEN_BACKGROUND = '#15111F'
const LIGHT_SCREEN_GRADIENT = ['#F4F4F6', '#E2E2E6'] as const
// Big radius on the top two corners only — the outer container is a
// "sheet" sitting on the screen background, flat/square on the bottom two
// corners (per the reference mockup) rather than a fully rounded card.
const SHEET_TOP_RADIUS = 28

export default function EarningsScreen() {
  const [period, setPeriod] = useState<'week' | 'month'>('week')
  const { data: context, isLoading: contextLoading } = useDriverContext()
  const { data: summary, isLoading: summaryLoading } = useEarningsSummary(period)
  const isLight = useThemeName() === 'light'
  const insets = useSafeAreaInsets()

  return (
    <View flex={1}>
      {isLight ? (
        <LinearGradient colors={LIGHT_SCREEN_GRADIENT} style={StyleSheet.absoluteFillObject} />
      ) : (
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: DARK_SCREEN_BACKGROUND }]} />
      )}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }}>
        <GlassSurface cornerRadius={SHEET_TOP_RADIUS} bottomCornerRadius={0} style={{ flex: 1, marginTop: insets.top + 12 }}>
          <YStack padding="$5" gap="$5">
            <Text fontSize="$6" fontWeight="800" color="$textPrimary">
              Earnings
            </Text>

            {!contextLoading && context && <TodayEarningsCard earnings={context.today_earnings} />}

            <EarningsPeriodTabs period={period} onPeriodChange={setPeriod} summary={summary} isLoading={summaryLoading} />

            {!contextLoading && context && <BonusList bonuses={context.active_bonuses} />}
          </YStack>
        </GlassSurface>
      </ScrollView>
    </View>
  )
}
