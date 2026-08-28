import { YStack, XStack, useThemeName } from 'tamagui'
import { AppText } from '../../../components/AppText'
import { getElevation } from '../../../theme/elevation'
import type { Bonus } from '../../../types'

// Keeps its own olive-amber promo tone (deliberately not a neutral Surface —
// the white wash would wash the colour out). Radius matches the app-wide
// card standard ($card token, 24) so it doesn't read as a different shape
// from every other card on the Earnings screen.
const BONUS_RADIUS = 24

const THEME_COLORS = {
  dark: { background: '#5C4A1E', title: '#F5F0E0', subtitle: '#C9BD98', amount: '#FFCB47' },
  light: { background: '#F0E4B0', title: '#3D3319', subtitle: '#7A6B45', amount: '#8A5A00' },
}

export function BonusList({ bonuses }: { bonuses: Bonus[] }) {
  const isLight = useThemeName() === 'light'
  const colors = isLight ? THEME_COLORS.light : THEME_COLORS.dark

  if (bonuses.length === 0) return null
  return (
    <YStack gap="$3">
      <AppText variant="h2">Thưởng đang áp dụng</AppText>
      {bonuses.map((bonus, i) => (
        <XStack
          key={i}
          alignItems="center"
          justifyContent="space-between"
          backgroundColor={colors.background}
          borderRadius={BONUS_RADIUS}
          overflow="hidden"
          padding="$4"
          gap="$3"
          style={getElevation('sm', isLight)}
        >
          <YStack flex={1}>
            <AppText variant="bodyStrong" style={{ color: colors.title }}>
              {bonus.description}
            </AppText>
            <AppText variant="caption" style={{ color: colors.subtitle }} marginTop={2}>
              Hết hạn {bonus.expires_at}
            </AppText>
          </YStack>
          <AppText variant="h2" style={{ color: colors.amount }}>
            {bonus.amount}
          </AppText>
        </XStack>
      ))}
    </YStack>
  )
}
