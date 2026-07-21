import { useMemo, useState } from "react";
import { TouchableOpacity, StyleSheet } from "react-native";
import { Text, XStack, YStack, View, useThemeName, useTheme } from "tamagui";
import { Ionicons } from "@expo/vector-icons";
import { Canvas, Fill, Shader, Skia } from "@shopify/react-native-skia";
import { Badge } from "../../../components/Badge";
import {
  TRIP_STATUS_LABELS,
  TRIP_STATUS_COLORS,
} from "../../../constants/status";
import { formatDate } from "../../../utils/format";
import {
  randomSpecularVariation,
  degToRad,
} from "../../../utils/glassSpecular";
import type { Trip } from "../../../types";

const CORNER_RADIUS = 28;
const CARD_MIN_HEIGHT = 88;

// Outer drop shadow — local to this card, not the shared getGlassShadow()
// (components/LiquidGlass) which is tuned for small elements (buttons,
// badges, tab bar) and reused across the whole app; retuning it here would
// ripple into every other glass surface.
//
// - Same `borderRadius: CORNER_RADIUS` is applied on this exact style array
//   (below, on the TouchableOpacity) as on the card body — RN's
//   shadow*/elevation props render around whatever border-radius sits on
//   that same view, so a mismatched radius (or the shadow living on a
//   different node than the rounded body) is what makes a shadow look
//   rectangular. There's no such mismatch here: one constant, one node.
// - X offset locked to 0 — shadowOffset.width is always 0, only .height
//   drops the shadow straight down.
// - No spread: RN's shadow props have no spread parameter at all (they
//   compile to a 3-value CSS box-shadow — offset/offset/blur — on web, and
//   Android's `elevation` has no spread control either), so there's nothing
//   to zero out beyond not adding one.
// - Dark uses a bigger blur at lower opacity instead of light's smaller
//   blur/higher opacity — a small hard-edged black shadow on the already-
//   dark #15111F page reads as a visible separate rectangle; a larger, very
//   faint one dissolves into the background instead.
function getCardOuterShadow(isLight: boolean) {
  return {
    shadowColor: isLight ? "#8B5CF6" : "#000000",
    shadowOffset: { width: 0, height: isLight ? 12 : 8 },
    // Light carries *all* of the card's elevation cue now that its inner
    // top shadow is gone (removed per spec) — bumped further than before
    // to compensate for that lost definition.
    shadowOpacity: isLight ? 0.28 : 0.16,
    shadowRadius: isLight ? 26 : 22,
    elevation: isLight ? 7 : 6,
  } as const;
}

// SkSL glass-card shader — paints the card's own rounded-rect surface with
// two glassmorphism cues baked into the fragment color: a dark inner shadow
// hugging the top edge (reads as a concave lip) and a rotated elliptical
// specular streak (reads as light grazing the glass). Unlike
// LiquidGlassTripCard.tsx this is a plain `<Shader>` fill, not a
// `BackdropFilter` — it paints its own translucent surface rather than
// refracting content behind it, so it alpha-composites normally against
// whatever real RN view sits behind this Canvas (the screen background).
const SHADER_SOURCE = `
uniform float2 resolution;
uniform float cornerRadius;
uniform float4 topColor;
uniform float4 bottomColor;
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

  // Antialiased silhouette coverage (0 outside the rounded rect, 1 inside).
  float coverage = 1.0 - smoothstep(-1.25, 1.25, d);
  if (coverage <= 0.0) {
    return half4(0.0);
  }

  // Two-stop vertical wash (top -> bottom), same recipe as GlassSurface —
  // was a single flat baseColor before; the light-mode reference calls for
  // a visible top-to-bottom gradient (#FFFFFF -> #E6E6EA), which a flat
  // fill can't express.
  float wash = smoothstep(0.0, resolution.y, p.y + halfSize.y);
  half4 base = mix(topColor, bottomColor, wash);
  half3 color = base.rgb;

  // Inner top shadow: darkens the upper portion of the card, fading out
  // toward mid-height and also fading out right at the border itself (via
  // borderFade) so it reads as a shadow *cast onto* the glass, not a second
  // outline stacked on the antialiased edge.
  float distFromTop = p.y + halfSize.y;
  float topFalloff = 1.0 - smoothstep(0.0, resolution.y * 0.6, distFromTop);
  float borderFade = smoothstep(0.0, 26.0, -d);
  float innerShadow = topFalloff * borderFade * topShadowAlpha;
  color = mix(color, half3(0.0), innerShadow);

  // Bright inset highlight hugging the bottom edge — thin and crisp, not a
  // broad wash. bottomHighlightAlpha = 0 (dark mode) reduces this to a
  // no-op; it's a light-mode-only cue per spec.
  float distFromBottom = halfSize.y - p.y;
  float bottomEdge = 1.0 - smoothstep(0.0, 2.5, distFromBottom);
  color = mix(color, half3(1.0), bottomEdge * bottomHighlightAlpha);

  // Specular highlight — position (specularOffset, a fraction of halfSize)
  // and angle are uniforms instead of a hardcoded top-left constant, so JS
  // can randomize them per card instance (randomSpecularVariation in
  // utils/glassSpecular.ts) — a list of cards no longer shows the identical
  // glint in the identical spot. specularScale grows the ellipse for a
  // softer/more diffuse look in light mode, paired with a lower intensity
  // and a wider feather ([0, 1.8] instead of [0.1, 1.3]) below.
  float2 sc = halfSize * specularOffset;
  float cosA = cos(specularAngle);
  float sinA = sin(specularAngle);
  float2 rp = p - sc;
  float2 rotated = float2(rp.x * cosA + rp.y * sinA, -rp.x * sinA + rp.y * cosA);
  float2 axes = float2(resolution.x * 0.32, resolution.y * 0.2) * specularScale;
  float ellipse = (rotated.x * rotated.x) / (axes.x * axes.x) + (rotated.y * rotated.y) / (axes.y * axes.y);
  float specular = (1.0 - smoothstep(0.0, 1.8, ellipse)) * specularIntensity;
  color += half3(1.0, 1.0, 1.0) * specular;

  // Skia runtime-effect fragment colors must be premultiplied by alpha.
  float finalAlpha = base.a * coverage;
  return half4(color * finalAlpha, finalAlpha);
}
`;

const effect = Skia.RuntimeEffect.Make(SHADER_SOURCE);
if (!effect) {
  throw new Error(
    "GlassTripCard: failed to compile the glass-card SkSL shader",
  );
}

// Theme-tuned shader params. Dark keeps the app's original purple-black
// panel look and its exact original fixed top-left glint (unaffected by
// this pass — light-mode-only per spec). Light drops the inner top shadow
// entirely (topShadowAlpha: 0 — floats above the page via outer shadow
// alone now, not carved into it) and softens the specular into a larger,
// fainter, position/angle-randomized glow instead of a crisp fixed
// top-left blob (see randomSpecularVariation below).
const DARK_SPECULAR_OFFSET: [number, number] = [-0.55, -0.35];
const DARK_SPECULAR_ANGLE_DEG = -24;
const BASE_LIGHT_SPECULAR_ANGLE_DEG = -19; // spec's -18..-20deg range

const THEME_PARAMS = {
  dark: {
    topColor: [0.132, 0.109, 0.16, 0.94] as [number, number, number, number], // ~#221C29
    bottomColor: [0.125, 0.102, 0.153, 0.94] as [
      number,
      number,
      number,
      number,
    ], // ~#201A27
    topShadowAlpha: 0.32,
    bottomHighlightAlpha: 0,
    specularIntensity: 0.15,
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

export interface GlassTripCardProps {
  trip: Trip;
  onPress: () => void;
}

export function GlassTripCard({ trip, onPress }: GlassTripCardProps) {
  const isLight = useThemeName() === "light";
  const theme = useTheme();
  const statusColor = TRIP_STATUS_COLORS[trip.status];
  const params = isLight ? THEME_PARAMS.light : THEME_PARAMS.dark;
  const [layout, setLayout] = useState({ width: 0, height: CARD_MIN_HEIGHT });
  // Rolled once per mounted card instance (empty deps) — each card in the
  // list keeps its own randomized glint for its whole lifetime.
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
      cornerRadius: CORNER_RADIUS,
      topColor: params.topColor,
      bottomColor: params.bottomColor,
      topShadowAlpha: params.topShadowAlpha,
      bottomHighlightAlpha: params.bottomHighlightAlpha,
      specularOffset,
      specularAngle: degToRad(specularAngleDeg),
      specularIntensity: params.specularIntensity,
      specularScale: params.specularScale,
    }),
    [layout.width, layout.height, params, specularOffset, specularAngleDeg],
  );

  return (
    // Single outermost touchable — onPress lives here, not on some inner
    // wrapper, so the entire card (including its rounded corners) is one hit
    // target. `onLayout` also lives here (not on a separate inner View) so
    // there is exactly one box whose measured size drives the Canvas below —
    // no second box that could end up a pixel off from it. `overflow:hidden`
    // + the shadow style are on this same node too: RN doesn't clip a view's
    // own shadow/elevation by its own overflow, only descendant content (see
    // Card.tsx for the same combination already used elsewhere in this app).
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[
        {
          minHeight: CARD_MIN_HEIGHT,
          borderRadius: CORNER_RADIUS,
          overflow: "hidden",
          borderWidth: 1,
          borderColor: isLight
            ? "rgba(255,255,255,0.24)"
            : "rgba(255,255,255,0.12)",
        },
        getCardOuterShadow(isLight),
      ]}
      onLayout={(e) =>
        setLayout({
          width: e.nativeEvent.layout.width,
          height: e.nativeEvent.layout.height,
        })
      }
    >
      {/* Direct child of the TouchableOpacity, absolutely filling it —
          purely visual (draws the card's fill + inner shadow + specular via
          coverage/sdRoundRect in SHADER_SOURCE), so pointerEvents="none"
          hands every touch straight through to the TouchableOpacity above
          it instead of intercepting any of them. */}
      {layout.width > 0 && (
        <Canvas style={StyleSheet.absoluteFillObject} pointerEvents="none">
          <Fill>
            {/* Non-null assertion: `effect` is validated once at module
                load (throws if compilation failed) — see guard above. */}
            <Shader source={effect!} uniforms={uniforms} />
          </Fill>
        </Canvas>
      )}

      <XStack alignItems="center" gap="$3" padding="$3" zIndex={1}>
        <View
          width={44}
          height={44}
          borderRadius={22}
          backgroundColor={statusColor.bg}
          alignItems="center"
          justifyContent="center"
        >
          <Ionicons name="car" size={20} color={theme.textPrimary.val} />
        </View>
        <YStack flex={1} gap="$1">
          <Text
            color="$textPrimary"
            fontSize="$3"
            fontWeight="700"
            numberOfLines={1}
          >
            {trip.pickup_address} → {trip.dropoff_address}
          </Text>
          <Text color="$textSecondary" fontSize={12} numberOfLines={1}>
            {formatDate(trip.created_at)}
            {trip.driver_phone ? ` · ${trip.driver_phone}` : ""}
          </Text>
        </YStack>
        <Badge
          label={TRIP_STATUS_LABELS[trip.status]}
          backgroundColor={statusColor.bg}
          color={statusColor.text}
          glass={false}
        />
      </XStack>
    </TouchableOpacity>
  );
}
