import { styled, Text, View, YStack, useTheme, useThemeName } from 'tamagui'
import { TextInput, type TextInputProps } from 'react-native'
import { GlassSheen, getGlassShadow } from './LiquidGlass'

const INPUT_RADIUS = 12
// Same problem/fix as Card: a solid `$surfaceElevated` behind the glass wash
// makes the wash invisible (white-on-white). Translucent base lets it read
// as glass instead of a flat bordered box.
const GLASS_BG_LIGHT = 'rgba(255,255,255,0.55)'
const GLASS_BG_DARK = 'rgba(36,29,44,0.72)'

// Plain-text-only style layer for the raw TextInput — background, border and
// shadow all live on the outer glass wrapper below, not here.
const StyledInput = styled(TextInput, {
  paddingHorizontal: '$4',
  paddingVertical: '$3',
  backgroundColor: 'transparent',
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
  const isLight = useThemeName() === 'light'

  return (
    <YStack gap="$1">
      {label && (
        <Text fontSize="$2" fontWeight="500" color="$textSecondary">
          {label}
        </Text>
      )}
      {/* Two nested Views, same reason as GlassMaterial: RN clips shadows on
          any view that also sets `overflow: hidden`, so the shadow has to
          live on a non-clipping outer view and the fill/border on an inner
          clipped one. */}
      <View style={error ? { shadowOpacity: 0, elevation: 0 } : getGlassShadow(isLight)}>
        <View
          style={{
            borderRadius: INPUT_RADIUS,
            overflow: 'hidden',
            backgroundColor: isLight ? GLASS_BG_LIGHT : GLASS_BG_DARK,
            borderWidth: error ? 1 : 0,
            borderColor: theme.danger.val,
          }}
        >
          <GlassSheen borderRadius={INPUT_RADIUS} />
          <StyledInput
            placeholderTextColor={theme.textMuted.val}
            // Highlighted-text (select-all) color — was left at the OS
            // default (a generic blue on both platforms), which clashed
            // against this app's purple-branded glass fields. Deliberately
            // brighter in dark mode (#C084FC vs #8B5CF6) since a highlight
            // needs more contrast against a dark field than a light one.
            selectionColor={isLight ? '#8B5CF6' : '#C084FC'}
            style={[{ fontSize: 16, color: theme.textPrimary.val }, style]}
            {...props}
          />
        </View>
      </View>
      {error && (
        <Text fontSize="$1" color="$danger">
          {error}
        </Text>
      )}
    </YStack>
  )
}
