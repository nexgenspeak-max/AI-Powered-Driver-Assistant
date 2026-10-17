import { useMemo } from 'react'
import { StyleSheet, View as RNView } from 'react-native'
import { Text } from 'tamagui'
import { Canvas, Fill, Shader, Skia } from '@shopify/react-native-skia'

// Same palette as the customer-app voice-assistant orb (white top -> magenta
// mid -> brand-purple bottom) — "glossy giống avatar AI" means the same
// lighting/color recipe, not literally the same WebGL point-cloud renderer
// (overkill for a static 96px circle). This is a compact SkSL "shaded
// sphere": a real per-pixel normal reconstructed from the circle's
// silhouette (nz = sqrt(1 - x^2 - y^2), the standard trick for faking a
// hemisphere from a flat disc), lit from the upper-left so it reads as a
// glossy 3D ball rather than a flat gradient circle.
const SHADER_SOURCE = `
uniform float2 resolution;
uniform float3 colorTop;
uniform float3 colorMid;
uniform float3 colorBottom;

half4 main(float2 fragCoord) {
  float2 center = resolution * 0.5;
  float radius = resolution.x * 0.5;
  float2 p = fragCoord - center;
  float dist = length(p);

  float coverage = 1.0 - smoothstep(radius - 1.25, radius + 1.25, dist);
  if (coverage <= 0.0) {
    return half4(0.0);
  }

  float2 nxy = p / radius;
  float nz2 = max(1.0 - nxy.x * nxy.x - nxy.y * nxy.y, 0.0);
  float nz = sqrt(nz2);
  float3 normal = normalize(float3(nxy.x, nxy.y, nz));

  // Vertical base gradient: top -> mid -> bottom, same three-stop recipe as
  // the assistant orb's vertex colors.
  float ny = clamp((nxy.y + 1.0) * 0.5, 0.0, 1.0);
  float3 base = ny < 0.5 ? mix(colorTop, colorMid, ny * 2.0) : mix(colorMid, colorBottom, (ny - 0.5) * 2.0);

  float3 lightDir = normalize(float3(-0.55, -0.6, 0.6));
  float diffuse = max(dot(normal, lightDir), 0.0);
  // Rim shadow: darkens toward the silhouette edge (nz -> 0), where a real
  // sphere's surface turns away from the viewer/light.
  float rim = pow(1.0 - nz, 2.2);

  float3 color = base * (0.6 + diffuse * 0.55) - rim * 0.28;
  // Tight, high-power specular hotspot — the "glossy plastic/glass" glint,
  // not a soft diffuse highlight.
  float specular = pow(diffuse, 42.0) * 0.95;
  color += specular;

  return half4(color * coverage, coverage);
}
`

const effect = Skia.RuntimeEffect.Make(SHADER_SOURCE)
if (!effect) {
  throw new Error('GlossyAvatar: failed to compile the glossy-sphere SkSL shader')
}

const COLOR_TOP: [number, number, number] = [1, 1, 1]
const COLOR_MID: [number, number, number] = [0.91, 0.47, 0.98] // #e879f9
const COLOR_BOTTOM: [number, number, number] = [0.545, 0.361, 0.965] // #8B5CF6

export interface GlossyAvatarProps {
  letter: string
  size?: number
}

export function GlossyAvatar({ letter, size = 96 }: GlossyAvatarProps) {
  const uniforms = useMemo(
    () => ({
      resolution: [size, size],
      colorTop: COLOR_TOP,
      colorMid: COLOR_MID,
      colorBottom: COLOR_BOTTOM,
    }),
    [size],
  )

  return (
    // Plain RN View, not Tamagui's — Tamagui's `View` doesn't reliably get
    // `position: relative` on web, so an absolutely-positioned Canvas child
    // would anchor to a distant ancestor instead of this box (see
    // customer-app's GlossyAvatar.tsx for the bug this avoids).
    <RNView style={{ width: size, height: size, position: 'relative', alignItems: 'center', justifyContent: 'center' }}>
      <Canvas style={StyleSheet.absoluteFillObject}>
        <Fill>
          {/* Non-null assertion: `effect` is validated once at module load
              (throws if compilation failed) — see guard above. */}
          <Shader source={effect!} uniforms={uniforms} />
        </Fill>
      </Canvas>
      {/* Absolute + zIndex so the letter stays above the Canvas on web too
          (positioned siblings paint over static ones regardless of order). */}
      <RNView style={[StyleSheet.absoluteFillObject, { alignItems: 'center', justifyContent: 'center', zIndex: 1 }]} pointerEvents="none">
        <Text color="#ffffff" fontSize={size * 0.375} fontWeight="700">
          {letter}
        </Text>
      </RNView>
    </RNView>
  )
}
