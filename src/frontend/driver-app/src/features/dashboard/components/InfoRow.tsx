import { XStack, Text } from 'tamagui'

export function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <XStack justifyContent="space-between">
      <Text color="$textSecondary" fontSize="$1">
        {label}
      </Text>
      <Text color="$textPrimary" fontSize="$1" fontWeight="500">
        {value}
      </Text>
    </XStack>
  )
}
