import { View as RNView } from 'react-native'
import { YStack, XStack, Text, useThemeName } from 'tamagui'
import type { Bonus } from '../../../types'

// Distinct promo/warning tone — deliberately NOT run through GlassSurface's
// neutral-white wash + specular shader (per spec: applying the white
// specular streak would wash out this card's characteristic olive-amber
// color). Only the outer shadow is shared with the rest of the "finalized"
// glass formula, so this card still reads as the same elevation as its
// neighbors, just a different material.
function getBonusOuterShadow(isLight: boolean) {
  return {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: isLight ? 0.12 : 0.22,
    shadowRadius: isLight ? 10 : 14,
    elevation: 3,
  } as const
}

const BONUS_RADIUS = 16

const THEME_COLORS = {
  dark: { background: '#5C4A1E', title: '#F5F0E0', subtitle: '#C9BD98', amount: '#FFCB47' },
  light: { background: '#E4D6A0', title: '#3D3319', subtitle: '#7A6B45', amount: '#8A5A00' },
}

export function BonusList({ bonuses }: { bonuses: Bonus[] }) {
  const isLight = useThemeName() === 'light'
  const colors = isLight ? THEME_COLORS.light : THEME_COLORS.dark

  if (bonuses.length === 0) return null
  return (
    <YStack gap="$3">
      <Text fontSize="$1" fontWeight="600" color="$textPrimary" textTransform="uppercase" letterSpacing={0.5}>
        Active bonuses
      </Text>
      {bonuses.map((bonus, i) => (
        <RNView key={i} style={{ borderRadius: BONUS_RADIUS, ...getBonusOuterShadow(isLight) }}>
          <XStack
            alignItems="center"
            justifyContent="space-between"
            backgroundColor={colors.background}
            borderRadius={BONUS_RADIUS}
            padding="$4"
          >
            <YStack flex={1} paddingRight="$2">
              <Text color={colors.title} fontWeight="500">
                {bonus.description}
              </Text>
              <Text color={colors.subtitle} fontSize="$1" marginTop="$1">
                Expires {bonus.expires_at}
              </Text>
            </YStack>
            <Text color={colors.amount} fontWeight="700" fontSize="$5">
              {bonus.amount}
            </Text>
          </XStack>
        </RNView>
      ))}
    </YStack>
  )
}
