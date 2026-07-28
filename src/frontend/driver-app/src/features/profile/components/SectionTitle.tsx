import { Text } from 'tamagui'

export function SectionTitle({ children }: { children: string }) {
  return (
    <Text color="$textSecondary" fontSize={12} fontWeight="700" paddingHorizontal="$4" paddingTop="$4" paddingBottom="$1">
      {children}
    </Text>
  )
}
