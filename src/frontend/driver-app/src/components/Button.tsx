import { useState } from 'react'
import { styled, Text, View, useTheme, GetProps } from 'tamagui'
import { View as RNView, ActivityIndicator, StyleSheet, type LayoutChangeEvent } from 'react-native'
import { GestureDetector } from 'react-native-gesture-handler'
import Animated from 'react-native-reanimated'
import { LinearGradient } from 'expo-linear-gradient'
import { GlassSheen, GlowOverlay, getGlassShadow, useGlassPress } from './LiquidGlass'

// Same purple-tinted outer shadow as GlassButton (the "Bắt đầu" CTA) —
// duplicated rather than imported since GlassButton doesn't export it, but
// kept byte-for-byte identical so every primary Button now casts the exact
// same shadow.
function getPrimaryOuterShadow(isLight: boolean) {
  return {
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: isLight ? 10 : 8 },
    shadowOpacity: isLight ? 0.4 : 0.3,
    shadowRadius: isLight ? 18 : 16,
    elevation: 6,
  } as const
}

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
      primary: {},
      dark: { backgroundColor: '$surfaceElevated' },
      outline: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '$borderStrong' },
      danger: { backgroundColor: '$danger' },
      success: { backgroundColor: '$success' },
    },
    full: { true: { flex: 1, width: '100%' } },
    isDisabled: {
      true: { backgroundColor: '$disabledBackground', opacity: 1 },
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
  /** Optional leading icon, e.g. a themed `<Image source={require(...)} />` — rendered before the label, hidden while `loading` (same slot as the spinner). */
  icon?: React.ReactNode
}

export function Button({ label, variant = 'primary', loading, disabled, onPress, full, icon, ...rest }: Props) {
  const isDisabled = !!(disabled || loading)
  const [size, setSize] = useState({ width: 0, height: 0 })
  const { gesture, stretchStyle, touchX, touchY, glowOpacity } = useGlassPress(size.width, size.height, {
    onPress,
    enabled: !isDisabled,
  })

  const handleLayout = (e: LayoutChangeEvent) => {
    setSize({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })
  }

  const { useThemeName } = require('tamagui')
  const isLight = useThemeName() === 'light'
  const theme = useTheme()

  // Matches GlassButton's ("Bắt đầu" CTA) purple-tinted outer shadow exactly
  // — same recipe now backs every primary button, not just that one screen.
  // Every other variant (outline/dark/danger/success) had no shadow at all —
  // fine in dark mode where the border/fill already reads against the dark
  // background, but in light mode an outline button all but disappears into
  // a light screen (e.g. driver-app dashboard's "Picked Up Customer"/"Cancel
  // Trip"). Light mode now gets the same soft glass shadow Card/Input use;
  // dark mode is left exactly as it was.
  const dynamicProps = variant === 'primary' ? getPrimaryOuterShadow(isLight) : isLight ? getGlassShadow(isLight) : {}
  // Primary always renders white text now (like GlassButton) — the previous
  // light-mode black-text carve-out was tuned for the old lighter gradient
  // (#7C5B9C); the darker one below reads fine with white in both themes.
  const labelColor = variant === 'outline' || variant === 'dark' ? '$textPrimary' : variant === 'primary' ? '#ffffff' : '$textInverse'
  const spinnerColor =
    variant === 'outline' || variant === 'dark' ? theme.textPrimary.val : variant === 'primary' ? '#ffffff' : theme.textInverse.val

  return (
    <GestureDetector gesture={gesture}>
      {/* `full` has to reach this wrapper too, not just ButtonFrame below —
          otherwise a row of two `full` buttons (Reject/Accept) won't actually
          split the space, since flex:1 on ButtonFrame alone has nothing to
          grow within (this wrapper had no size of its own). */}
      <Animated.View style={[full ? { flex: 1 } : undefined, stretchStyle]}>
        {/* Shadow lives on this plain RN View, not on ButtonFrame below — RN
            (and RN Web) clips/glitches a view's own drop shadow when that
            same view also sets `overflow: hidden` (needed on ButtonFrame to
            clip the gradient fill/sheen/glow to the pill shape), producing
            an uneven corner instead of a clean pill curve. Same outer-
            shadow/inner-clip split as GlassMaterial, and — like there — a
            plain View with an inline style array, not a new Tamagui
            `styled()` component, which came out invisible at runtime for
            reasons that didn't show up in typecheck. */}
        <RNView
          style={[
            { borderRadius: 999 },
            full ? { flex: 1, width: '100%' } : undefined,
            isDisabled ? undefined : dynamicProps,
          ]}
        >
          <ButtonFrame variant={variant} isDisabled={isDisabled} full={full} onLayout={handleLayout} {...rest}>
            {variant === 'primary' && !isDisabled && (
              // Explicit borderRadius here too, not just relying on
              // ButtonFrame's `overflow: hidden` to clip it — on web the
              // parent clip and this absolute-fill layer can round very
              // slightly differently, leaving a square sliver of gradient
              // poking out right at the pill's tightest curve (the left/right
              // end-caps).
              <LinearGradient
                colors={['#6D28D9', '#A855F7']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[StyleSheet.absoluteFillObject, { borderRadius: 999 }]}
              />
            )}
            {!isDisabled && (
              <>
                {/* Primary skips the white glass sheen entirely — matches
                    GlassButton's flatter, cleaner look (just the gradient +
                    the purple outer shadow above, no glossy wash on top).
                    Other variants (outline/dark/danger/success) keep it
                    unchanged. $button token is a pill (999) — RN clamps
                    borderRadius to the box's own half-height automatically,
                    so passing that same constant here always matches
                    ButtonFrame's clip exactly (using a measured
                    size.height/2 raced the first layout pass and briefly
                    drew a square-cornered ring). */}
                {variant !== 'primary' && <GlassSheen borderRadius={999} />}
                <GlowOverlay size={140} id="buttonGlow" touchX={touchX} touchY={touchY} glowOpacity={glowOpacity} />
              </>
            )}
            {loading && <ActivityIndicator size="small" color={spinnerColor} />}
            {!loading && icon}
            <Text
              fontWeight="600"
              fontSize="$4"
              color={isDisabled ? '$disabledText' : labelColor}
              zIndex={1}
            >
              {label}
            </Text>
          </ButtonFrame>
        </RNView>
      </Animated.View>
    </GestureDetector>
  )
}
