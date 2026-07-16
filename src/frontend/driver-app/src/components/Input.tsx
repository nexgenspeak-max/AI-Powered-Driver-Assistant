import { styled, Text, YStack, useTheme } from 'tamagui'
import { TextInput, type TextInputProps } from 'react-native'

const StyledInput = styled(TextInput, {
  borderWidth: 1,
  borderColor: '$border',
  borderRadius: '$control',
  paddingHorizontal: '$4',
  paddingVertical: '$3',
  backgroundColor: '$surfaceElevated',

  variants: {
    hasError: { true: { borderColor: '$danger' } },
  } as const,
})

interface Props extends TextInputProps {
  label?: string
  error?: string
}

export function Input({ label, error, style, ...props }: Props) {
  // `color`/`fontSize`/`placeholderTextColor` aren't in Tamagui's style-prop
  // set for a raw TextInput base (StackStyleBase excludes text-only
  // categories on this component type) — resolve theme-aware hex via
  // useTheme() and apply as plain style/props instead, so light/dark switch.
  const theme = useTheme()
  return (
    <YStack gap="$1">
      {label && (
        <Text fontSize="$2" fontWeight="500" color="$textSecondary">
          {label}
        </Text>
      )}
      <StyledInput
        hasError={!!error}
        placeholderTextColor={theme.textMuted.val}
        style={[{ fontSize: 16, color: theme.textPrimary.val }, style]}
        {...props}
      />
      {error && (
        <Text fontSize="$1" color="$danger">
          {error}
        </Text>
      )}
    </YStack>
  )
}
