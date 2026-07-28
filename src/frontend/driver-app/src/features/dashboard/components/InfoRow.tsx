import { XStack, Text } from 'tamagui'

export function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <XStack justifyContent="space-between" gap="$3">
      <Text color="$textSecondary" fontSize="$1">
        {label}
      </Text>
      <Text color="$textPrimary" fontSize="$1" fontWeight="500" flexShrink={1} textAlign="right">
        {value}
      </Text>
    </XStack>
  )
}
