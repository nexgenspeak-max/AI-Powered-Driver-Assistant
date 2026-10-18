import { useState } from 'react'
import { TextInput, TouchableOpacity, View as RNView, type TextInputProps } from 'react-native'
import { styled, Text, View, YStack, useTheme, useThemeName } from 'tamagui'
import { Icon } from './icons'
import { authGlassTheme } from '../theme'

const { field: FIELD_THEME } = authGlassTheme

// Outer shadow only — no inner concave shadow. Distinct from
// GlassBookingInput's shader (which still carves a top lip in dark mode):
// on this screen's much darker card, a carved inner shadow reads as mud
// rather than glass, so the auth-field formula drops it entirely.
function getAuthInputShadow(isLight: boolean) {
  const s = FIELD_THEME.shadow
  return {
    shadowColor: isLight ? s.color.light : s.color.dark,
    shadowOffset: { width: 0, height: isLight ? s.offsetY.light : s.offsetY.dark },
    shadowOpacity: isLight ? s.opacity.light : s.opacity.dark,
    shadowRadius: isLight ? s.radius.light : s.radius.dark,
    elevation: s.elevation,
  } as const
}

// Plain-text-only style layer for the raw TextInput — background, border and
// shadow all live on the outer glass wrapper below, not here (mirrors Input.tsx).
const StyledInput = styled(TextInput, {
  paddingHorizontal: '$4',
  paddingVertical: '$3',
  backgroundColor: 'transparent',
})

interface Props extends TextInputProps {
  label?: string
  error?: string
}

// Auth-screen glass field — label sits above the box (not floated inside
// it, unlike GlassBookingInput), matching the "Welcome back" reference
// mockup's plain label + input pairing.
export function GlassAuthInput({ label, error, style, secureTextEntry, ...props }: Props) {
  const theme = useTheme()
  const isLight = useThemeName() === 'light'
  // Password fields (secureTextEntry passed by the caller) get a reveal
  // toggle — `visible` overrides the caller's own secureTextEntry rather
  // than replacing it outright, so a non-password field passing
  // secureTextEntry={false} is unaffected (isPassword stays false, no icon).
  const [visible, setVisible] = useState(false)
  const isPassword = !!secureTextEntry

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
      <RNView style={error ? undefined : getAuthInputShadow(isLight)}>
        <View
          style={{
            borderRadius: FIELD_THEME.radius,
            overflow: 'hidden',
            backgroundColor: isLight ? FIELD_THEME.background.light : FIELD_THEME.background.dark,
            borderWidth: 1,
            borderColor: error ? theme.danger.val : isLight ? FIELD_THEME.ring.light : FIELD_THEME.ring.dark,
          }}
        >
          <StyledInput
            placeholderTextColor={theme.textMuted.val}
            // Highlighted-text (select-all) color — was left at the OS
            // default (a generic blue), which clashed against this app's
            // purple-branded glass fields. Brighter in dark mode (#C084FC
            // vs #8B5CF6) since a highlight needs more contrast against a
            // dark field than a light one.
            selectionColor={isLight ? '#8B5CF6' : '#C084FC'}
            secureTextEntry={isPassword && !visible}
            style={[
              { fontSize: 16, color: theme.textPrimary.val },
              // Room for the eye toggle so typed text never runs under it.
              isPassword && { paddingRight: 44 },
              // RN Web compiles TextInput to a real <input>, which browsers
              // give a default focus outline (often blue) — that's a second,
              // unwanted border color appearing on top of our own `ring`
              // border the moment you start typing. Native (iOS/Android)
              // ignores this property entirely.
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              { outlineStyle: 'none' } as any,
              style,
            ]}
            {...props}
          />
          {isPassword && (
            <TouchableOpacity
              onPress={() => setVisible(v => !v)}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              style={{ position: 'absolute', right: 14, top: 0, bottom: 0, justifyContent: 'center' }}
            >
              <Icon name={visible ? 'eye-off' : 'eye'} size={20} color={theme.textMuted.val} />
            </TouchableOpacity>
          )}
        </View>
      </RNView>
      {error && (
        <Text fontSize="$1" color="$danger">
          {error}
        </Text>
      )}
    </YStack>
  )
}
