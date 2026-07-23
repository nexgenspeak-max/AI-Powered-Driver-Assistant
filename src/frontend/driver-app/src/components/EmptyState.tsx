import { View, YStack, Text } from 'tamagui'
import { Ionicons } from '@expo/vector-icons'
import { GlassSurface } from './GlassSurface'
import { Button } from './Button'

interface Props {
  icon: keyof typeof Ionicons.glyphMap
  title: string
  message: string
  actionLabel?: string
  onAction?: () => void
}

// Shared "not built yet" card for profile sub-screens that have no backend
// support (bank/payout info, document verification, ...) — same visual
// language as the rest of the profile (GlassSurface + Button) instead of a
// bare "coming soon" text dump.
export function EmptyState({ icon, title, message, actionLabel, onAction }: Props) {
  return (
    <GlassSurface cornerRadius={20} outline>
      <YStack alignItems="center" gap="$3" padding="$6">
        <View width={64} height={64} borderRadius={32} backgroundColor="$primaryMuted" alignItems="center" justifyContent="center">
          <Ionicons name={icon} size={28} color="#7C5B9C" />
        </View>
        <Text fontWeight="700" fontSize="$4" color="$textPrimary" textAlign="center">
          {title}
        </Text>
        <Text color="$textSecondary" textAlign="center" fontSize={13} lineHeight={19}>
          {message}
        </Text>
        {actionLabel && <Button label={actionLabel} variant="outline" onPress={onAction} />}
      </YStack>
    </GlassSurface>
  )
}
