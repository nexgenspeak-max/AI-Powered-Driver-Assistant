import { useMemo, useState } from 'react'
import { TextInput, type TextInputProps, type NativeSyntheticEvent, type TextInputFocusEventData, View as RNView, StyleSheet } from 'react-native'
import { styled, Text, View, YStack, useTheme, useThemeName } from 'tamagui'
import { LinearGradient } from 'expo-linear-gradient'
import { FloatingLabel } from './FloatingLabel'
import { randomSpecularVariation } from '../../../utils/glassSpecular'

const CORNER_RADIUS = 16
const BASE_LIGHT_SPECULAR_ANGLE_DEG = -19

function getInputOuterShadow(isLight: boolean) {
  return {
    shadowColor: isLight ? '#8B5CF6' : '#000000',
    shadowOffset: { width: 0, height: isLight ? 6 : 3 },
    // Softer/more diffuse than the first pass (0.22/15 read as a visible
    // hard-edged "frame" around the field, especially on the left/right
    // sides where a box-shadow's blur is most noticeable against a plain
    // background) — lower opacity, wider blur dissolves it into a gentle
    // floating cue instead of a rectangle outline.
    shadowOpacity: isLight ? 0.14 : 0.2,
    shadowRadius: isLight ? 22 : 10,
    elevation: isLight ? 3 : 2,
  } as const
}

// Web fallback — same reasoning as GlassBookingInput.tsx's header comment:
// `@shopify/react-native-skia` doesn't run on Expo web without extra
// CanvasKit/WASM setup, so the SkSL wash+rim+shadow+specular shader is
// approximated with plain gradients here: the two-stop vertical wash *is*
// the field's own LinearGradient background (no shader needed for that
// part on web), a top-down LinearGradient for the inner shadow, and the
// small top-left radial glow used elsewhere (see GlassTripCard.web.tsx).
// Light also gets a new bottom inset highlight LinearGradient, which dark
// mode doesn't have at all (see GlassBookingInput.tsx).
const THEME_PARAMS = {
  dark: {
    washColors: ['rgba(41,33,49,0.5)', 'rgba(20,18,28,0.5)'] as const,
    topShadowColors: ['rgba(0,0,0,0.24)', 'rgba(0,0,0,0)'] as const,
    bottomHighlightColors: ['rgba(255,255,255,0)', 'rgba(255,255,255,0)'] as const,
    // Specular top-left glint removed per spec — transparent-to-transparent
    // is a no-op for the radial-gradient it feeds, kept (not deleted) so
    // re-enabling it later is a one-line change.
    specularPeak: 'rgba(255,255,255,0)',
    ringColor: 'rgba(255,255,255,0.05)',
  },
  light: {
    washColors: ['rgba(255,255,255,0.97)', 'rgba(230,230,234,0.92)'] as const,
    // Inner top shadow removed per spec — light now floats via outer
    // shadow alone (transparent-to-transparent below is a no-op).
    topShadowColors: ['rgba(0,0,0,0)', 'rgba(0,0,0,0)'] as const,
    bottomHighlightColors: ['rgba(255,255,255,0)', 'rgba(255,255,255,0.5)'] as const,
    specularPeak: 'rgba(255,255,255,0)',
    ringColor: 'rgba(255,255,255,0.7)',
  },
}

// Fixed paddingTop/paddingBottom (not centered $3/$3) reserve room at the
// top for the floated label at all times — see GlassBookingInput.tsx for
// the same reasoning. borderWidth/outlineWidth: 0 — the browser's default
// <input> border and focus outline were invisible before (painted *behind*
// the wash/shadow layers, back when this input was still `position:
// static` — see the zIndex fix a few lines down) and only became visible
// once that stacking fix promoted the input above them, showing up as a
// stray rectangular frame that doesn't match the field's rounded shape.
// outlineStyle: 'none' is required *in addition to* outlineWidth: 0 —
// Chromium's UA stylesheet sets a focused <input>'s outline-style to
// `auto`, which is a native browser-drawn focus ring rendered independently
// of outline-width (confirmed via getComputedStyle: outline-width reported
// 0px yet the ring still painted). Only forcing outline-style to `none`
// actually suppresses it; width alone does not.
const StyledInput = styled(TextInput, {
  paddingHorizontal: '$4',
  paddingTop: 22,
  paddingBottom: 10,
  backgroundColor: 'transparent',
  borderWidth: 0,
  outlineWidth: 0,
  outlineStyle: 'none',
})

interface Props extends TextInputProps {
  label?: string
  error?: string
}

export function GlassBookingInput({ label, error, style, value, onFocus, onBlur, ...props }: Props) {
  const theme = useTheme()
  const isLight = useThemeName() === 'light'
  const params = isLight ? THEME_PARAMS.light : THEME_PARAMS.dark
  const [fieldHeight, setFieldHeight] = useState(0)
  const [focused, setFocused] = useState(false)
  const labelActive = focused || !!value

  const handleFocus = (e: NativeSyntheticEvent<TextInputFocusEventData>) => {
    setFocused(true)
    onFocus?.(e)
  }
  const handleBlur = (e: NativeSyntheticEvent<TextInputFocusEventData>) => {
    setFocused(false)
    onBlur?.(e)
  }

  // Rolled once per mounted field instance — each field keeps its own
  // randomized glint for its whole lifetime.
  const lightVariation = useMemo(() => randomSpecularVariation(BASE_LIGHT_SPECULAR_ANGLE_DEG), [])
  const specularTop = isLight ? `${-15 + lightVariation.offsetY * 40}%` : '-10%'
  const specularLeft = isLight ? `${15 + lightVariation.offsetX * 40}%` : '-12%'
  const specularRotation = isLight ? `${lightVariation.angleDeg}deg` : '-24deg'

  return (
    <YStack gap="$1">
      {/* Outer view's own borderRadius — its shadow follows *its own*
          border-radius, not the inner clipped view's, so this was missing
          before and the cast shadow rendered squared-off around a visually
          rounded field. */}
      <RNView style={[{ borderRadius: CORNER_RADIUS }, error ? { shadowOpacity: 0, elevation: 0 } : getInputOuterShadow(isLight)]}>
        <View
          borderRadius={CORNER_RADIUS}
          overflow="hidden"
          borderWidth={1}
          borderColor={error ? '$danger' : params.ringColor}
          onLayout={e => setFieldHeight(e.nativeEvent.layout.height)}
        >
          <LinearGradient
            colors={params.washColors}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={StyleSheet.absoluteFillObject}
            pointerEvents="none"
          />
          <LinearGradient
            colors={params.topShadowColors}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 0.7 }}
            style={StyleSheet.absoluteFillObject}
            pointerEvents="none"
          />
          {/* Bottom inset highlight — thin bright line, light-mode-only
              (dark's colors are transparent-to-transparent, a no-op). */}
          <LinearGradient
            colors={params.bottomHighlightColors}
            start={{ x: 0.5, y: 0.92 }}
            end={{ x: 0.5, y: 1 }}
            style={StyleSheet.absoluteFillObject}
            pointerEvents="none"
          />
          <RNView
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: CORNER_RADIUS, overflow: 'hidden' }}
            pointerEvents="none"
          >
            <RNView
              style={
                {
                  position: 'absolute',
                  // Small corner glow, same proportions as the trip card's
                  // (GlassTripCard.web.tsx) — the previous 160%-tall box was
                  // copy-pasted from a taller element and, on this field's
                  // much shorter height, read as a big diagonal sheen across
                  // most of the box instead of a small glint.
                  top: specularTop,
                  left: specularLeft,
                  // Bigger in light mode — a larger blob at a fainter peak
                  // reads as soft/diffuse instead of a small crisp glint.
                  width: isLight ? '60%' : '42%',
                  height: isLight ? '60%' : '42%',
                  transform: [{ rotate: specularRotation }],
                  // Web-only CSS escape hatch (not part of RN's ViewStyle).
                  backgroundImage: `radial-gradient(ellipse at 40% 40%, ${params.specularPeak} 0%, rgba(255,255,255,0) 70%)`,
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                } as any
              }
            />
          </RNView>
          <StyledInput
            value={value}
            onFocus={e => handleFocus(e as unknown as NativeSyntheticEvent<TextInputFocusEventData>)}
            onBlur={e => handleBlur(e as unknown as NativeSyntheticEvent<TextInputFocusEventData>)}
            placeholderTextColor={theme.textMuted.val}
            // Highlighted-text (select-all) color — was left at the OS
            // default (a generic blue), which clashed against this app's
            // purple-branded glass fields. Brighter in dark mode (#C084FC
            // vs #8B5CF6) since a highlight needs more contrast against a
            // dark field than a light one.
            selectionColor={isLight ? '#8B5CF6' : '#C084FC'}
            style={[
              {
                fontSize: 16,
                color: theme.textPrimary.val,
                // Typed text was rendering visibly faded — not a font
                // rendering/antialiasing issue (verified: computed color,
                // -webkit-text-fill-color, opacity, filter were all
                // correct). The real cause is a CSS stacking rule: this
                // <input> renders as `position: static` by default, while
                // the decorative wash/shadow/specular layers above are all
                // `position: absolute`. Per the CSS painting-order spec,
                // *positioned* elements (even at z-index:0/auto) always
                // paint above *static* in-flow content, regardless of DOM
                // order — so those layers were painting on top of the
                // input's own text despite coming earlier in the JSX.
                // Making the input itself `position: relative` promotes it
                // into the same positioned stacking category; the explicit
                // zIndex then puts it above the (zIndex: 0) decorative
                // layers within that category.
                position: 'relative',
                zIndex: 1,
              },
              style,
            ]}
            {...props}
          />
          {label && <FloatingLabel label={label} active={labelActive} fieldHeight={fieldHeight} />}
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
