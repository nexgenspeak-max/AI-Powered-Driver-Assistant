import { useMemo, useState } from 'react'
import { TouchableOpacity, ActivityIndicator, StyleSheet, View as RNView } from 'react-native'
import { Text, useThemeName } from 'tamagui'
import { LinearGradient } from 'expo-linear-gradient'
import { Canvas, Fill, Shader, Skia } from '@shopify/react-native-skia'

const BUTTON_HEIGHT = 52
// Purple CTA exception: the gradient fill itself never changes between
// themes — only the glass cues layered on top of it do (see THEME_PARAMS
// below and the shader's comment for why the fill and the glass overlay
// are two separate layers).
const DEFAULT_GRADIENT_COLORS = ['#8B5CF6', '#C084FC'] as const
const DISABLED_COLOR = '#4A4552'

// Outer drop shadow — X-offset locked to 0, no spread (RN's shadow props
// don't have one), purple-tinted (not black) to match the gradient fill it
// sits behind in both themes. Light needs it visibly stronger/"rõ" — a
// purple-on-purple shadow needs more contrast than dark mode's already-dark
// surroundings give it for free.
function getButtonOuterShadow(isLight: boolean) {
  return {
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: isLight ? 10 : 8 },
    shadowOpacity: isLight ? 0.4 : 0.3,
    shadowRadius: isLight ? 18 : 16,
    elevation: 6,
  } as const
}

// SkSL glass *overlay* shader — unlike GlassSurface's/GlassBookingInput's
// shader, this one paints no base fill at all: it starts fully transparent
// and only composites a dark top shadow then a light specular streak on top
// of whatever's already drawn behind it (the LinearGradient below, in this
// component's own render). That's what keeps the purple gradient visible
// through the glass — this Canvas adds the "glass" cues, it doesn't own the
// button's color.
const SHADER_SOURCE = `
uniform float2 resolution;
uniform float cornerRadius;
uniform float topShadowAlpha;
uniform float specularAngle;
uniform float specularIntensity;

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

  half3 outRGB = half3(0.0);
  float outA = 0.0;

  // Layer 1: dark inner shadow near the top border — composited as black
  // "over" transparent (standard alpha-over, twice, once per layer below).
  float distFromTop = p.y + halfSize.y;
  float topFalloff = 1.0 - smoothstep(0.0, resolution.y * 0.75, distFromTop);
  float borderFade = smoothstep(0.0, 12.0, -d);
  float shadowA = topFalloff * borderFade * topShadowAlpha;
  outA = shadowA + outA * (1.0 - shadowA);

  // Layer 2: specular streak, composited (white) over layer 1.
  float2 sc = float2(-halfSize.x * 0.5, -halfSize.y * 0.4);
  float cosA = cos(specularAngle);
  float sinA = sin(specularAngle);
  float2 rp = p - sc;
  float2 rotated = float2(rp.x * cosA + rp.y * sinA, -rp.x * sinA + rp.y * cosA);
  float2 axes = float2(resolution.x * 0.3, resolution.y * 0.55);
  float ellipse = (rotated.x * rotated.x) / (axes.x * axes.x) + (rotated.y * rotated.y) / (axes.y * axes.y);
  float specA = (1.0 - smoothstep(0.1, 1.3, ellipse)) * specularIntensity;
  outRGB = half3(1.0, 1.0, 1.0) * specA + outRGB * (1.0 - specA);
  outA = specA + outA * (1.0 - specA);

  float finalAlpha = outA * coverage;
  return half4(outRGB * finalAlpha, finalAlpha);
}
`

const effect = Skia.RuntimeEffect.Make(SHADER_SOURCE)
if (!effect) {
  throw new Error('GlassButton: failed to compile the glass-overlay SkSL shader')
}

// Purple CTA exception's glass tuning — dimmer specular ("opacity thấp
// hơn... rgba(255,255,255,0.5) thay vì gần như trắng đặc" vs. the white
// cards' much brighter highlight) and a lighter inner shadow, so the glass
// cues read as an overlay on top of the brand purple rather than fighting
// it for attention. Dark mode is untouched (its previous fixed values).
const THEME_PARAMS = {
  dark: { topShadowAlpha: 0.22, specularAngle: -0.42, specularIntensity: 0.16 },
  light: { topShadowAlpha: 0.16, specularAngle: -0.33, specularIntensity: 0.3 },
}

export interface GlassButtonProps {
  label: string
  onPress: () => void
  loading?: boolean
  disabled?: boolean
  /** Overrides the purple gradient's two stops — defaults to the app's
   *  standard CTA purple. Doesn't change between themes either way (the
   *  purple CTA exception applies to whatever pair is passed in). */
  colors?: readonly [string, string]
}

// Reusable "purple CTA + glass overlay" button — the exception carve-out
// from the general white-glass card formula (GlassSurface): the gradient
// fill stays purple in both themes, only the glass cues on top (specular,
// inner shadow, outer shadow tint) adapt per theme. Originally
// `GlassBookButton` in features/booking — promoted here once a second
// caller (VoiceEnrollPanel's "Bắt đầu" button) needed the exact same
// recipe with a different gradient pair.
export function GlassButton({ label, onPress, loading, disabled, colors }: GlassButtonProps) {
  const isLight = useThemeName() === 'light'
  const params = isLight ? THEME_PARAMS.light : THEME_PARAMS.dark
  const isDisabled = !!(disabled || loading)
  const [layout, setLayout] = useState({ width: 0, height: BUTTON_HEIGHT })
  // A pill: full-height corner radius so the SDF rounds both end-caps into
  // semicircles, matching RN's own borderRadius:999 auto-clamp.
  const cornerRadius = layout.height / 2

  const uniforms = useMemo(
    () => ({
      resolution: [layout.width, layout.height],
      cornerRadius,
      topShadowAlpha: params.topShadowAlpha,
      specularAngle: params.specularAngle,
      specularIntensity: params.specularIntensity,
    }),
    [layout.width, layout.height, cornerRadius, params],
  )

  return (
    // Single outermost touchable — onPress, sizing, borderRadius/overflow
    // and the shadow all live on this one node (same fix as
    // GlassTripCard.tsx's touch-area bug: no separate inner wrapper that
    // could end up a different size than what the Canvas below fills).
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.85}
      style={[
        { minHeight: BUTTON_HEIGHT, width: '100%', borderRadius: 999, overflow: 'hidden' },
        !isDisabled && getButtonOuterShadow(isLight),
      ]}
      onLayout={e => setLayout({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}
    >
      <LinearGradient
        colors={isDisabled ? [DISABLED_COLOR, DISABLED_COLOR] : (colors ?? DEFAULT_GRADIENT_COLORS)}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      {!isDisabled && layout.width > 0 && (
        <Canvas style={StyleSheet.absoluteFillObject} pointerEvents="none">
          <Fill>
            {/* Non-null assertion: `effect` is validated once at module
                load (throws if compilation failed) — see guard above. */}
            <Shader source={effect!} uniforms={uniforms} />
          </Fill>
        </Canvas>
      )}
      <RNView
        style={{
          minHeight: BUTTON_HEIGHT,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          paddingHorizontal: 20,
        }}
      >
        {loading && <ActivityIndicator size="small" color="#ffffff" />}
        <Text style={{ color: '#ffffff', fontWeight: '600', fontSize: 16 }}>{label}</Text>
      </RNView>
    </TouchableOpacity>
  )
}
