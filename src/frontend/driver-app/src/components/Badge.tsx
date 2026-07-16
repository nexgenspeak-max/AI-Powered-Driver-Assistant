import { styled, Text, View, useTheme } from 'tamagui'

const BadgeFrame = styled(View, {
  paddingHorizontal: 10,
  paddingVertical: 4,
  borderRadius: '$pill',
  alignSelf: 'flex-start',
})

interface Props {
  label: string
  /** Tamagui color token or literal color, e.g. "$primaryMuted" or "rgba(255,255,255,0.08)". Defaults to a neutral theme-aware chip. */
  backgroundColor?: string
  color?: string
}

export function Badge({ label, backgroundColor, color }: Props) {
  const theme = useTheme()
  return (
    <BadgeFrame backgroundColor={backgroundColor ?? theme.border.val}>
      <Text fontSize={11} fontWeight="600" color={color ?? theme.textSecondary.val}>
        {label}
      </Text>
    </BadgeFrame>
  )
}
