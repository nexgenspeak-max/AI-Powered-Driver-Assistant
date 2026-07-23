import { YStack, Text } from 'tamagui'

export function EmptyTripsState({ isOnline }: { isOnline: boolean }) {
  return (
    <YStack flex={1} alignItems="center" justifyContent="center" paddingVertical="$10">
      <Text fontSize={48} marginBottom="$3">
        ✅
      </Text>
      <Text fontWeight="700" color="$textSecondary" fontSize="$4">
        {isOnline ? 'No trips right now' : 'You are offline'}
      </Text>
      <Text fontSize="$2" color="$textSecondary" marginTop="$1" textAlign="center">
        {isOnline ? 'Waiting for new assignments...' : 'Toggle Online to start receiving trips'}
      </Text>
    </YStack>
  )
}
