import { useState } from 'react'
import { styled, Text, View, GetProps } from 'tamagui'
import { ActivityIndicator, StyleSheet, type LayoutChangeEvent } from 'react-native'
import { GestureDetector } from 'react-native-gesture-handler'
import Animated from 'react-native-reanimated'
import { LinearGradient } from 'expo-linear-gradient'
import { GlassSheen, GlowOverlay, useGlassPress } from './LiquidGlass'

const ButtonFrame = styled(View, {
  minHeight: 52,
  paddingVertical: '$3',
  paddingHorizontal: '$5',
  borderRadius: '$button',
  alignItems: 'center',
  flexDirection: 'row',
  justifyContent: 'center',
  gap: '$2',
  overflow: 'hidden',

  variants: {
    variant: {
      // Pill shape, gradient fill, soft outer glow — no border, per the
      // "Neo Glass + Soft Dark" spec (shadow instead of border).
      primary: {
        shadowColor: '#A855F7',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.45,
        shadowRadius: 12,
      },
      dark: { backgroundColor: '$surfaceElevated' },
      outline: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '$borderStrong' },
      danger: { backgroundColor: '$danger' },
      success: { backgroundColor: '$success' },
    },
    full: { true: { flex: 1, width: '100%' } },
    isDisabled: {
      true: { backgroundColor: '$disabledBackground', shadowOpacity: 0, opacity: 1 },
    },
  } as const,

  defaultVariants: { variant: 'primary' },
})

type FrameProps = GetProps<typeof ButtonFrame>

interface Props extends Omit<FrameProps, 'variant' | 'disabled' | 'onPress'> {
  label: string
  variant?: 'primary' | 'outline' | 'danger' | 'success' | 'dark'
  loading?: boolean
  disabled?: boolean
  onPress?: () => void
}

export function Button({ label, variant = 'primary', loading, disabled, onPress, full, ...rest }: Props) {
  const isDisabled = !!(disabled || loading)
  const [size, setSize] = useState({ width: 0, height: 0 })
  const { gesture, stretchStyle, touchX, touchY, glowOpacity } = useGlassPress(size.width, size.height, {
    onPress,
    enabled: !isDisabled,
  })

  const handleLayout = (e: LayoutChangeEvent) => {
    setSize({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })
  }

  return (
    <GestureDetector gesture={gesture}>
      {/* `full` has to reach this wrapper too, not just ButtonFrame below —
          otherwise a row of two `full` buttons (Reject/Accept) won't actually
          split the space, since flex:1 on ButtonFrame alone has nothing to
          grow within (this wrapper had no size of its own). */}
      <Animated.View style={[full ? { flex: 1 } : undefined, stretchStyle]}>
        <ButtonFrame variant={variant} isDisabled={isDisabled} full={full} onLayout={handleLayout} {...rest}>
          {variant === 'primary' && !isDisabled && (
            <LinearGradient
              colors={['#7C5B9C', '#A855F7']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFillObject}
            />
          )}
          {!isDisabled && (
            <>
              <GlassSheen borderRadius={size.height / 2} />
              <GlowOverlay size={140} id="buttonGlow" touchX={touchX} touchY={touchY} glowOpacity={glowOpacity} />
            </>
          )}
          {loading && <ActivityIndicator size="small" color="#fff" />}
          <Text
            fontWeight="600"
            fontSize="$4"
            color={isDisabled ? '$disabledText' : variant === 'outline' || variant === 'dark' ? '$textPrimary' : '$textInverse'}
            zIndex={1}
          >
            {label}
          </Text>
        </ButtonFrame>
      </Animated.View>
    </GestureDetector>
  )
}
