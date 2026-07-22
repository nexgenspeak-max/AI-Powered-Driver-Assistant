import { useMemo, useState } from 'react'
import { TextInput, type TextInputProps, type NativeSyntheticEvent, type TextInputFocusEventData, View as RNView, StyleSheet } from 'react-native'
import { styled, Text, View, YStack, useTheme, useThemeName } from 'tamagui'
import { Canvas, Fill, Shader, Skia } from '@shopify/react-native-skia'
import { FloatingLabel } from './FloatingLabel'
import { randomSpecularVariation, degToRad } from '../../../utils/glassSpecular'

const CORNER_RADIUS = 16

// Outer drop shadow — small/local to this field, not the shared
// getGlassShadow() (components/LiquidGlass). X-offset locked to 0, blur
// only (RN's shadow props have no spread parameter), tuned much fainter
// than the trip-card shadow since these sit inside an already near-
// transparent form card, not directly on the page background.
function getInputOuterShadow(isLight: boolean) {
  return {
    shadowColor: isLight ? '#8B5CF6' : '#000000',
    shadowOffset: { width: 0, height: isLight ? 6 : 3 },
    // Softer/more diffuse than the first pass (0.22/15 read as a visible
    // hard-edged "frame" around the field, especially on the left/right
    // sides where a shadow's blur is most noticeable against a plain
    // background) — lower opacity, wider blur dissolves it into a gentle
    // floating cue instead of a rectangle outline.
    shadowOpacity: isLight ? 0.14 : 0.2,
    shadowRadius: isLight ? 22 : 10,
    elevation: isLight ? 3 : 2,
  } as const
}

// SkSL glass-field shader — same recipe as GlassTripCard's card shader
// (features/trips/components/GlassTripCard.tsx): a rounded-rect SDF fill,
// a dark inner shadow hugging the top edge (concave lip), and a small
// rotated elliptical specular streak anchored top-left. Two additions here:
// a two-stop vertical wash (topColor -> bottomColor) for the "gradient nhẹ"
// body tint the trip card didn't need, and a thin bright rim right at the
// border (ringColor) — the crisp top highlight line visible on the
// reference field mockups.
const SHADER_SOURCE = `
uniform float2 resolution;
uniform float cornerRadius;
uniform float4 topColor;
uniform float4 bottomColor;
uniform float4 ringColor;
uniform float topShadowAlpha;
uniform float bottomHighlightAlpha;
uniform float2 specularOffset;
uniform float specularAngle;
uniform float specularIntensity;
uniform float specularScale;

float sdRoundRect(float2 p, float2 halfSize, float radius) {
  float2 q = abs(p) - halfSize + radius;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - radius;
}

half4 main(float2 fragCoord) {
  float2 halfSize = resolution * 0.5;
  float2 p = fragCoord - halfSize;
  float d = sdRoundRect(p, halfSize, cornerRadius);

  float coverage = 1.0 - smoothstep(-1.25, 1.25, d);
  if (coverage <= 0.0) {
    return half4(0.0);
  }

  float wash = smoothstep(0.0, resolution.y, p.y + halfSize.y);
  half4 base = mix(topColor, bottomColor, wash);
  half3 color = base.rgb;
  float baseAlpha = mix(topColor.a, bottomColor.a, wash);

  // Thin bright rim hugging the border on all sides — a 1-2px band right
  // at d=0, distinct from (and outside) the darker interior shadow below.
  float rim = (1.0 - smoothstep(0.0, 2.5, abs(d))) * ringColor.a;
  color = mix(color, ringColor.rgb, rim);
  baseAlpha = max(baseAlpha, rim);

  // Inner top shadow: concave lip, same shape as the trip card's.
  float distFromTop = p.y + halfSize.y;
  float topFalloff = 1.0 - smoothstep(0.0, resolution.y * 0.7, distFromTop);
  float borderFade = smoothstep(2.5, 16.0, -d);
  float innerShadow = topFalloff * borderFade * topShadowAlpha;
  color = mix(color, half3(0.0), innerShadow);

  // Bright inset highlight hugging the bottom edge — thin and crisp.
  // bottomHighlightAlpha = 0 (dark mode) reduces this to a no-op.
  float distFromBottom = halfSize.y - p.y;
  float bottomEdge = 1.0 - smoothstep(0.0, 2.0, distFromBottom);
  color = mix(color, half3(1.0), bottomEdge * bottomHighlightAlpha);

  // Specular streak — position (specularOffset, a fraction of halfSize) and
  // angle are uniforms instead of a hardcoded top-left constant, so JS can
  // randomize them per field instance (randomSpecularVariation in
  // utils/glassSpecular.ts). specularScale grows the ellipse for a softer,
  // more diffuse look in light mode, paired with a lower intensity and a
  // wider feather ([0, 1.8] instead of [0.1, 1.3]) below.
  float2 sc = halfSize * specularOffset;
  float cosA = cos(specularAngle);
  float sinA = sin(specularAngle);
  float2 rp = p - sc;
  float2 rotated = float2(rp.x * cosA + rp.y * sinA, -rp.x * sinA + rp.y * cosA);
  float2 axes = float2(resolution.x * 0.3, resolution.y * 0.4) * specularScale;
  float ellipse = (rotated.x * rotated.x) / (axes.x * axes.x) + (rotated.y * rotated.y) / (axes.y * axes.y);
  float specular = (1.0 - smoothstep(0.0, 1.8, ellipse)) * specularIntensity;
  color += half3(1.0, 1.0, 1.0) * specular;

  float finalAlpha = baseAlpha * coverage;
  return half4(color * finalAlpha, finalAlpha);
}
`

const effect = Skia.RuntimeEffect.Make(SHADER_SOURCE)
if (!effect) {
  throw new Error('GlassBookingInput: failed to compile the glass-field SkSL shader')
}

// Dark stays close to the near-black form card behind it
// (rgba(255,255,255,0.03)), with its exact original fixed top-left glint —
// unaffected by this pass (light-mode-only per spec). Light drops the inner
// top shadow entirely (topShadowAlpha: 0) and softens the specular into a
// larger, fainter, position/angle-randomized glow instead of a crisp fixed
// top-left blob (see randomSpecularVariation below).
const DARK_SPECULAR_OFFSET: [number, number] = [-0.55, -0.35]
const DARK_SPECULAR_ANGLE_DEG = -24
const BASE_LIGHT_SPECULAR_ANGLE_DEG = -19 // spec's -18..-20deg range

const THEME_PARAMS = {
  dark: {
    topColor: [0.16, 0.13, 0.19, 0.5] as [number, number, number, number],
    bottomColor: [0.08, 0.07, 0.11, 0.5] as [number, number, number, number],
    ringColor: [1, 1, 1, 0.05] as [number, number, number, number],
    topShadowAlpha: 0.24,
    bottomHighlightAlpha: 0,
    // Specular top-left glint removed per spec — the shader term is still
    // computed (harmless at 0) rather than deleted, so re-enabling it later
    // is a one-line change instead of rewriting the shader.
    specularIntensity: 0,
    specularScale: 1,
  },
  light: {
    topColor: [1, 1, 1, 0.97] as [number, number, number, number], // ~#FFFFFF
    bottomColor: [0.9, 0.9, 0.918, 0.92] as [number, number, number, number], // ~#E6E6EA
    ringColor: [1, 1, 1, 0.7] as [number, number, number, number],
    topShadowAlpha: 0,
    bottomHighlightAlpha: 0.5,
    specularIntensity: 0,
    specularScale: 1.6,
  },
}

// Plain-text-only style layer for the raw TextInput — background, border and
// shadow all live on the glass wrapper below, not here (mirrors Input.tsx).
// Fixed paddingTop/paddingBottom (not centered $3/$3) reserve room at the
// top for the floated label at all times — the only state where that room
// would look empty is "unfocused and empty," where there's no typed text to
// misalign anyway.
const StyledInput = styled(TextInput, {
  paddingHorizontal: '$4',
  paddingTop: 22,
  paddingBottom: 10,
  backgroundColor: 'transparent',
})

interface Props extends TextInputProps {
  label?: string
  error?: string
}

export function GlassBookingInput({ label, error, style, value, onFocus, onBlur, ...props }: Props) {
  const theme = useTheme()
  const isLight = useThemeName() === 'light'
  const params = isLight ? THEME_PARAMS.light : THEME_PARAMS.dark
  const [layout, setLayout] = useState({ width: 0, height: 0 })
  const [focused, setFocused] = useState(false)
  const labelActive = focused || !!value

  // Not typed against RN's NativeSyntheticEvent<TextInputFocusEventData>
  // directly — Tamagui's `styled(TextInput, ...)` wrapper types its
  // onFocus/onBlur props slightly differently (its own FocusEvent/
  // BlurEvent), so these are inferred inline from that prop position in the
  // JSX below and forwarded to the outer (RN-typed) onFocus/onBlur as-is —
  // same underlying native event object either way, just two different
  // compile-time views of it.
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
  const specularOffset: [number, number] = isLight ? [lightVariation.offsetX, lightVariation.offsetY] : DARK_SPECULAR_OFFSET
  const specularAngleDeg = isLight ? lightVariation.angleDeg : DARK_SPECULAR_ANGLE_DEG

  const uniforms = useMemo(
    () => ({
      resolution: [layout.width, layout.height],
      cornerRadius: CORNER_RADIUS,
      topColor: params.topColor,
      bottomColor: params.bottomColor,
      ringColor: params.ringColor,
      topShadowAlpha: params.topShadowAlpha,
      bottomHighlightAlpha: params.bottomHighlightAlpha,
      specularOffset,
      specularAngle: degToRad(specularAngleDeg),
      specularIntensity: params.specularIntensity,
      specularScale: params.specularScale,
    }),
    [layout.width, layout.height, params, specularOffset, specularAngleDeg],
  )

  return (
    <YStack gap="$1">
      {/* Outer view owns the drop shadow only (no overflow:hidden here —
          Android can clip a view's own elevation shadow when the same view
          also clips its content, see GlassMaterial.tsx). It still needs its
          own `borderRadius` though — a view's shadow/elevation follows that
          same view's own border-radius, not a child's, so without this the
          cast shadow rendered squared-off around a visually rounded field.
          Inner view owns the rounded clip, and is the exact box the Canvas
          fills — same reasoning as the GlassTripCard touch-area fix: Canvas
          and the real interactive control (TextInput here) are both direct
          children of this one sized box, no separate mismatched wrapper. */}
      <RNView style={[{ borderRadius: CORNER_RADIUS }, error ? { shadowOpacity: 0, elevation: 0 } : getInputOuterShadow(isLight)]}>
        <View
          borderRadius={CORNER_RADIUS}
          overflow="hidden"
          borderWidth={error ? 1 : 0}
          borderColor="$danger"
          onLayout={e => setLayout({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}
        >
          {layout.width > 0 && (
            <Canvas style={StyleSheet.absoluteFillObject} pointerEvents="none">
              <Fill>
                {/* Non-null assertion: `effect` is validated once at module
                    load (throws if compilation failed) — see guard above. */}
                <Shader source={effect!} uniforms={uniforms} />
              </Fill>
            </Canvas>
          )}
          <StyledInput
            value={value}
            onFocus={e => handleFocus(e as unknown as NativeSyntheticEvent<TextInputFocusEventData>)}
            onBlur={e => handleBlur(e as unknown as NativeSyntheticEvent<TextInputFocusEventData>)}
            placeholderTextColor={theme.textMuted.val}
            style={[{ fontSize: 16, color: theme.textPrimary.val }, style]}
            {...props}
          />
          {label && <FloatingLabel label={label} active={labelActive} fieldHeight={layout.height} />}
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
