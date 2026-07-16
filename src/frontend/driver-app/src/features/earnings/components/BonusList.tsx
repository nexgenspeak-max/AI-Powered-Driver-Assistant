import { YStack, Text } from 'tamagui'
import { Card } from '../../../components/Card'
import type { Bonus } from '../../../types'

export function BonusList({ bonuses }: { bonuses: Bonus[] }) {
  if (bonuses.length === 0) return null
  return (
    <YStack gap="$3">
      <Text fontSize="$1" fontWeight="600" color="$textSecondary" textTransform="uppercase" letterSpacing={0.5}>
        Active bonuses
      </Text>
      {bonuses.map((bonus, i) => (
        <Card
          key={i}
          flexDirection="row"
          alignItems="center"
          justifyContent="space-between"
          backgroundColor="$yellow2"
          borderColor="$yellow6"
        >
          <YStack flex={1} paddingRight="$2">
            <Text color="$textPrimary" fontWeight="500">
              {bonus.description}
            </Text>
            <Text color="$textSecondary" fontSize="$1" marginTop={2}>
              Expires {bonus.expires_at}
            </Text>
          </YStack>
          <Text color="$yellow11" fontWeight="700" fontSize="$5">
            {bonus.amount}
          </Text>
        </Card>
      ))}
    </YStack>
  )
}
