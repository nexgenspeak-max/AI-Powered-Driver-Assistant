import { XStack } from 'tamagui'
import { Icon, type IconName } from './icons'
import { useTheme } from 'tamagui'
import { Surface } from './Surface'
import { AppText } from './AppText'

// Compact figure tile — a caption label over a big value. Used by the earnings
// screen and the profile "Thống kê" block instead of ad-hoc label/value rows.
//
// Duplicated in customer-app/src/components/StatCard.tsx.

export type StatCardProps = {
  label: string
  value: string
  icon?: IconName
}

export function StatCard({ label, value, icon }: StatCardProps) {
  const theme = useTheme()
  return (
    <Surface clip borderRadius={24} level="sm" flex={1} padding="$3" gap="$2">
      <XStack alignItems="center" gap="$2">
        {icon && (
          <Icon name={icon} size={14} color={theme.textMuted.val} />
        )}
        <AppText variant="caption" color="$textSecondary">
          {label}
        </AppText>
      </XStack>
      <AppText variant="h2">{value}</AppText>
    </Surface>
  )
}
