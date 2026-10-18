import { View, YStack, useTheme } from 'tamagui'
import { Icon, type IconName } from './icons'
import { Surface } from './Surface'
import { AppText } from './AppText'
import { Button } from './Button'

interface Props {
  icon: IconName
  title: string
  message: string
  actionLabel?: string
  onAction?: () => void
}

// Shared empty / "not built yet" card — same visual language as the rest of
// the app (Surface + Button).
export function EmptyState({ icon, title, message, actionLabel, onAction }: Props) {
  const theme = useTheme()
  return (
    <Surface level="none" borderWidth={1} borderColor="$border">
      <YStack alignItems="center" gap="$3" padding="$6">
        <View
          width={64}
          height={64}
          borderRadius={32}
          backgroundColor="$primaryMuted"
          alignItems="center"
          justifyContent="center"
        >
          <Icon name={icon} size={28} color={theme.primary.val} />
        </View>
        <AppText variant="title" textAlign="center">
          {title}
        </AppText>
        <AppText variant="body" color="$textSecondary" textAlign="center">
          {message}
        </AppText>
        {actionLabel && <Button label={actionLabel} variant="outline" onPress={onAction} />}
      </YStack>
    </Surface>
  )
}
