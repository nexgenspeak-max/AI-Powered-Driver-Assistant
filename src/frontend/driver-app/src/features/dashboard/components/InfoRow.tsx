import { XStack } from 'tamagui'
import { AppText } from '../../../components/AppText'

export function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <XStack justifyContent="space-between" gap="$3">
      <AppText variant="caption" color="$textSecondary">
        {label}
      </AppText>
      <AppText variant="caption" color="$textPrimary" flexShrink={1} textAlign="right">
        {value}
      </AppText>
    </XStack>
  )
}
