import { styled, Text, GetProps } from 'tamagui'
import { TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'

const ButtonFrame = styled(TouchableOpacity, {
  minHeight: 52,
  paddingVertical: '$3',
  paddingHorizontal: '$4',
  borderRadius: '$control',
  alignItems: 'center',
  flexDirection: 'row',
  justifyContent: 'center',
  gap: '$2',
  overflow: 'hidden',

  variants: {
    variant: {
      primary: {},
      dark: { backgroundColor: '$surfaceElevated', borderWidth: 1, borderColor: '$border' },
      outline: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '$borderStrong' },
      danger: { backgroundColor: '$danger' },
      success: { backgroundColor: '$success' },
    },
    full: { true: { flex: 1, width: '100%' } },
    isDisabled: { true: { opacity: 0.5 } },
  } as const,

  defaultVariants: { variant: 'primary' },
})

type FrameProps = GetProps<typeof ButtonFrame>

interface Props extends Omit<FrameProps, 'variant' | 'disabled'> {
  label: string
  variant?: 'primary' | 'outline' | 'danger' | 'success' | 'dark'
  loading?: boolean
  disabled?: boolean
}

export function Button({ label, variant = 'primary', loading, disabled, ...rest }: Props) {
  const isDisabled = disabled || loading
  return (
    <ButtonFrame
      variant={variant}
      isDisabled={isDisabled}
      disabled={isDisabled}
      activeOpacity={0.85}
      {...rest}
    >
      {variant === 'primary' && (
        <LinearGradient
          colors={['#7C5B9C', '#A855F7']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
      )}
      {loading && <ActivityIndicator size="small" color="#fff" />}
      <Text
        fontWeight="600"
        fontSize="$4"
        color={variant === 'outline' || variant === 'dark' ? '$textPrimary' : '$textInverse'}
        zIndex={1}
      >
        {label}
      </Text>
    </ButtonFrame>
  )
}
