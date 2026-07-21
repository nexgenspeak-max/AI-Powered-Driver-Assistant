import { useMemo, useState, type ReactNode } from "react";
import { TouchableOpacity, View as RNView, StyleSheet } from "react-native";
import { useThemeName } from "tamagui";
import { Canvas, Fill, Shader, Skia } from "@shopify/react-native-skia";
import { randomSpecularVariation, degToRad } from "../utils/glassSpecular";

const DEFAULT_CORNER_RADIUS = 18;

// Outer drop shadow — X-offset locked to 0, no spread (RN's shadow props
// don't have one). Same recipe as GlassTripCard/GlassBookingInput's local
// shadow helpers, generalized here since this is now the third or fourth
// place applying the exact same "finalized" formula.
function getSurfaceOuterShadow(isLight: boolean) {
  return {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: isLight ? 12 : 6 },
    // Light mode carries *all* of the card's elevation cue now that its
    // inner top shadow is gone (removed per spec — light mode reads
    // "floating above the page" via outer shadow only, not "carved into
    // it" via an inner concave lip) — bumped further than before (0.22->
    // 0.28, 20->26) to compensate for that lost definition.
    shadowOpacity: isLight ? 0.28 : 0.2,
    shadowRadius: isLight ? 26 : 18,
    elevation: isLight ? 7 : 4,
  } as const;
}

// SkSL glass-surface shader — the finalized card recipe shared by
// GlassTripCard.tsx and GlassBookingInput.tsx, generalized: rounded-rect SDF
// fill with a two-stop vertical wash, a dark inner shadow hugging the top
// edge (concave lip), a bright inset highlight hugging the *bottom* edge,
// and a small rotated elliptical specular streak anchored top-left — all
// clipped to the same coverage mask as the fill (so nothing can poke past
// the rounded corner).
const SHADER_SOURCE = `
uniform float2 resolution;
uniform float topRadius;
uniform float bottomRadius;
uniform float4 topColor;
uniform float4 bottomColor;
uniform float topShadowAlpha;
uniform float bottomHighlightAlpha;
uniform float2 specularOffset;
uniform float specularAngle;
uniform float specularIntensity;
uniform float specularScale;

// Per-pixel radius picked from which half (top/bottom) the pixel falls in —
// cheap way to get a "rounded top, square bottom" sheet without a full
// 4-corner SDF. The two halves' formulas only disagree deep in the box's
// interior (SDF very negative there regardless), never near either edge, so
// there's no visible seam at the y=0 split — see VoiceEnrollPanel's
// sheet=true usage for why (topRadius != bottomRadius there; every other
// caller passes them equal, which reduces to the original uniform-radius
// shader exactly).
float sdRoundRect(float2 p, float2 halfSize, float topRadius, float bottomRadius) {
  float radius = p.y < 0.0 ? topRadius : bottomRadius;
  float2 q = abs(p) - halfSize + radius;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - radius;
}

half4 main(float2 fragCoord) {
  float2 halfSize = resolution * 0.5;
  float2 p = fragCoord - halfSize;
  float d = sdRoundRect(p, halfSize, topRadius, bottomRadius);

  float coverage = 1.0 - smoothstep(-1.25, 1.25, d);
  if (coverage <= 0.0) {
    return half4(0.0);
  }

  float wash = smoothstep(0.0, resolution.y, p.y + halfSize.y);
  half4 base = mix(topColor, bottomColor, wash);
  half3 color = base.rgb;
  float baseAlpha = mix(topColor.a, bottomColor.a, wash);

  // Inner top shadow: concave lip, fades out toward mid-height and away
  // from the border itself so it reads as cast onto the glass, not a
  // second outline stacked on the antialiased edge.
  float distFromTop = p.y + halfSize.y;
  float topFalloff = 1.0 - smoothstep(0.0, resolution.y * 0.55, distFromTop);
  float borderFade = smoothstep(0.0, 22.0, -d);
  float innerShadow = topFalloff * borderFade * topShadowAlpha;
  color = mix(color, half3(0.0), innerShadow);

  // Bright inset highlight hugging the bottom edge — a thin, crisp line
  // (not a broad wash like the top shadow), gated purely on distance from
  // the bottom border. Zeroed out (bottomHighlightAlpha = 0) reduces this
  // to a no-op, which is exactly the dark-mode call — this cue is light-
  // mode-only per spec. Coverage still clips it at the rounded corners, so
  // it naturally curves with the shape instead of needing its own corner
  // logic.
  float distFromBottom = halfSize.y - p.y;
  float bottomEdge = 1.0 - smoothstep(0.0, 2.5, distFromBottom);
  color = mix(color, half3(1.0), bottomEdge * bottomHighlightAlpha);

  // Specular streak — position (specularOffset, a fraction of halfSize) and
  // angle are uniforms instead of a hardcoded top-left constant, so JS can
  // randomize them per component instance (see randomSpecularVariation in
  // utils/glassSpecular.ts) — every card no longer shows the identical
  // glint in the identical spot, which read as a mechanical stamp repeated
  // down a list. specularScale grows the ellipse (softer, more diffuse —
  // paired with a lower specularIntensity and a wider feather below,
  // instead of a crisp, clearly-bounded blob).
  float2 sc = halfSize * specularOffset;
  float cosA = cos(specularAngle);
  float sinA = sin(specularAngle);
  float2 rp = p - sc;
  float2 rotated = float2(rp.x * cosA + rp.y * sinA, -rp.x * sinA + rp.y * cosA);
  float2 axes = float2(resolution.x * 0.3, resolution.y * 0.22) * specularScale;
  float ellipse = (rotated.x * rotated.x) / (axes.x * axes.x) + (rotated.y * rotated.y) / (axes.y * axes.y);
  float specular = (1.0 - smoothstep(0.0, 1.8, ellipse)) * specularIntensity;
  color += half3(1.0, 1.0, 1.0) * specular;

  float finalAlpha = baseAlpha * coverage;
  return half4(color * finalAlpha, finalAlpha);
}
`;

const effect = Skia.RuntimeEffect.Make(SHADER_SOURCE);
if (!effect) {
  throw new Error(
    "GlassSurface: failed to compile the glass-surface SkSL shader",
  );
}

// Dark keeps its original fixed top-left glint (offset/angle/scale below
// are its exact previous constants — unaffected by this pass, which is
// light-mode-only per spec). Light drops the inner top shadow entirely
// (topShadowAlpha: 0 — this card now reads as "floating above the page"
// via outer shadow alone, not "carved into it"), and softens the specular
// into a larger, fainter, position/angle-randomized glow instead of a
// crisp fixed top-left blob (see randomSpecularVariation below).
const DARK_SPECULAR_OFFSET: [number, number] = [-0.5, -0.4];
const DARK_SPECULAR_ANGLE_DEG = -24;
const BASE_LIGHT_SPECULAR_ANGLE_DEG = -19; // spec's -18..-20deg range

const THEME_PARAMS = {
  dark: {
    topColor: [1, 1, 1, 0.09] as [number, number, number, number],
    bottomColor: [1, 1, 1, 0.05] as [number, number, number, number],
    topShadowAlpha: 0.22,
    bottomHighlightAlpha: 0,
    specularIntensity: 0.16,
    specularScale: 1,
  },
  light: {
    topColor: [1, 1, 1, 0.97] as [number, number, number, number], // ~#FFFFFF
    bottomColor: [0.9, 0.9, 0.918, 0.92] as [number, number, number, number], // ~#E6E6EA
    topShadowAlpha: 0,
    bottomHighlightAlpha: 0.55,
    specularIntensity: 0.16,
    specularScale: 1.5,
  },
};

export interface GlassSurfaceProps {
  cornerRadius?: number;
  /** Overrides the bottom two corners' radius independently — e.g. 0 for a
   *  "rounded top, flat bottom" sheet (VoiceEnrollPanel's `sheet` mode).
   *  Defaults to `cornerRadius`, i.e. every existing caller (uniform
   *  rounding on all 4 corners) is unaffected. */
  bottomCornerRadius?: number;
  onPress?: () => void;
  style?: { flex?: number; [key: string]: unknown };
  children?: ReactNode;
  /** Override the default shader top shadow alpha (use 0 for floating glass). */
  topShadowAlpha?: number;
  /** Override the default shader bottom highlight alpha. */
  bottomHighlightAlpha?: number;
}

// Reusable "finalized" glassmorphism card — same recipe as
// GlassTripCard/GlassBookingInput, factored out here since this is now the
// third/fourth surface using it (avatar card, phone row, settings list on
// the Profile screen). Non-interactive by default; pass `onPress` to make
// the whole surface a single touch target (same single-Pressable structure
// as GlassTripCard's touch-area fix — Canvas is pointerEvents="none" and a
// direct child of whichever outer node owns sizing/press).
export function GlassSurface({
  cornerRadius = DEFAULT_CORNER_RADIUS,
  bottomCornerRadius = cornerRadius,
  onPress,
  style,
  children,
}: GlassSurfaceProps) {
  const isLight = useThemeName() === "light";
  const params = isLight ? THEME_PARAMS.light : THEME_PARAMS.dark;
  const [layout, setLayout] = useState({ width: 0, height: 0 });
  // Rolled once per mounted instance (empty deps), not per render or per
  // theme flip — each card/surface keeps its own randomized glint for its
  // whole lifetime instead of jittering around.
  const lightVariation = useMemo(
    () => randomSpecularVariation(BASE_LIGHT_SPECULAR_ANGLE_DEG),
    [],
  );
  const specularOffset: [number, number] = isLight
    ? [lightVariation.offsetX, lightVariation.offsetY]
    : DARK_SPECULAR_OFFSET;
  const specularAngleDeg = isLight
    ? lightVariation.angleDeg
    : DARK_SPECULAR_ANGLE_DEG;

  const uniforms = useMemo(
    () => ({
      resolution: [layout.width, layout.height],
      topRadius: cornerRadius,
      bottomRadius: bottomCornerRadius,
      topColor: params.topColor,
      bottomColor: params.bottomColor,
      topShadowAlpha: topShadowAlpha ?? params.topShadowAlpha,
      bottomHighlightAlpha: bottomHighlightAlpha ?? params.bottomHighlightAlpha,
      specularOffset,
      specularAngle: degToRad(specularAngleDeg),
      specularIntensity: params.specularIntensity,
      specularScale: isLight
        ? params.specularScale * lightVariation.sizeScale
        : params.specularScale,
    }),
    [
      layout.width,
      layout.height,
      cornerRadius,
      bottomCornerRadius,
      params,
      specularOffset,
      specularAngleDeg,
      isLight,
      lightVariation.sizeScale,
    ],
  );

  const handleLayout = (e: {
    nativeEvent: { layout: { width: number; height: number } };
  }) =>
    setLayout({
      width: e.nativeEvent.layout.width,
      height: e.nativeEvent.layout.height,
    });

  const canvas = layout.width > 0 && (
    <Canvas style={StyleSheet.absoluteFillObject} pointerEvents="none">
      <Fill>
        {/* Non-null assertion: `effect` is validated once at module load
            (throws if compilation failed) — see guard above. */}
        <Shader source={effect!} uniforms={uniforms} />
      </Fill>
    </Canvas>
  );

  const cornerStyle = {
    borderTopLeftRadius: cornerRadius,
    borderTopRightRadius: cornerRadius,
    borderBottomLeftRadius: bottomCornerRadius,
    borderBottomRightRadius: bottomCornerRadius,
  };

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.85}
        style={[
          { ...cornerStyle, overflow: "hidden" },
          getSurfaceOuterShadow(isLight),
          style,
        ]}
        onLayout={handleLayout}
      >
        {canvas}
        {children}
      </TouchableOpacity>
    );
  }

  return (
    // Split outer/inner (shadow-only outer, clip-only inner) — this surface
    // has no press target of its own, so there's no touch-area reason to
    // keep it a single node the way GlassTripCard/GlassBookButton do; this
    // split instead protects the shadow from Android's overflow-clips-
    // elevation quirk (see GlassMaterial.tsx). Both share the same corner
    // radii so the shadow's own silhouette still matches the visible card
    // exactly.
    <RNView style={[cornerStyle, getSurfaceOuterShadow(isLight), style]}>
      {/* Forwards only the caller's own `flex` value (not a blanket
          `flex: 1`) — see driver-app's GlassSurface.tsx for why a blanket
          value there broke touch/layout for a nested case; same reasoning
          applies here. */}
      <RNView
        style={{ ...cornerStyle, overflow: "hidden", flex: style?.flex }}
        onLayout={handleLayout}
      >
        {canvas}
        {children}
      </RNView>
    </RNView>
  );
}
