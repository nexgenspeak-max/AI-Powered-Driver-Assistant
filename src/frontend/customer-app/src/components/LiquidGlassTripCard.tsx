import { useMemo, useState, type ReactNode } from 'react'
import { StyleSheet, TouchableOpacity, View } from 'react-native'
import { Text, XStack, YStack } from 'tamagui'
import { Ionicons } from '@expo/vector-icons'
import {
  BackdropFilter,
  Canvas,
  Fill,
  LinearGradient as SkiaLinearGradient,
  RuntimeShader,
  Skia,
  vec,
} from '@shopify/react-native-skia'
import { useDerivedValue, useFrameCallback, useSharedValue } from 'react-native-reanimated'
import { Badge } from './Badge'
import { TRIP_STATUS_LABELS, TRIP_STATUS_COLORS } from '../constants/status'
import type { TripStatus } from '../types'

const CORNER_RADIUS = 22
const CARD_MIN_HEIGHT = 84

// SDF (signed distance field) for a rounded rect, in pixels, centered on the
// card — standard Inigo Quilez formula. Negative inside the shape, 0 on the
// border, positive outside; used both to mask the card's silhouette and (via
// its gradient/normal) to drive the refraction, chromatic aberration and rim
// specular below.
//
// `image` is not a custom uniform we pass in — Skia binds it automatically
// to whatever content this shader is filtering (see `RuntimeShader` as a
// `BackdropFilter`'s `filter` below): that's the "backdrop" this whole
// effect distorts. In this component that backdrop is a plain gradient
// `<Fill>` drawn earlier in the *same* Canvas (see the note on
// `LiquidGlassTripCard` below for why it can't be real app content sitting
// behind this card in the native view tree).
const SHADER_SOURCE = `
uniform float2 resolution;
uniform float cornerRadius;
uniform float time;
uniform float2 lightAngle;
uniform shader image;

float sdRoundRect(float2 p, float2 halfSize, float radius) {
  float2 q = abs(p) - halfSize + radius;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - radius;
}

half4 main(float2 fragCoord) {
  float2 center = resolution * 0.5;
  float2 p = fragCoord - center;
  float2 halfSize = resolution * 0.5;
  float d = sdRoundRect(p, halfSize, cornerRadius);

  if (d > 0.0) {
    return half4(0.0);
  }

  // "Glass thickness" — 0 right at the border, ramping to 1 over
  // 'edgeBand' px toward the interior. Everything below reads off of
  // edgeFactor (1 at the rim, 0 in the middle) so the refraction/
  // aberration/specular all concentrate right at the edge, like light
  // bending through the rim of an actual glass tile instead of a flat
  // pane.
  float edgeBand = 24.0;
  float interiorFactor = smoothstep(0.0, edgeBand, -d);
  float edgeFactor = 1.0 - interiorFactor;

  // Cheap 2-tap finite-difference gradient of the SDF, i.e. the surface
  // normal at this point — points from the border straight into the card.
  float eps = 1.0;
  float dx = sdRoundRect(p + float2(eps, 0.0), halfSize, cornerRadius) - d;
  float dy = sdRoundRect(p + float2(0.0, eps), halfSize, cornerRadius) - d;
  float2 normal = normalize(float2(dx, dy) + 1e-5);

  // Refraction: pull the backdrop sample inward along the normal, strongest
  // right at the rim and fading to none toward the center (a flat pane of
  // glass doesn't bend light, only its bent edge does).
  float refractStrength = edgeFactor * 14.0;
  float2 refractedUV = fragCoord - normal * refractStrength;

  // Chromatic aberration: sample R/G/B at slightly different offsets along
  // the same normal, same edge-only falloff.
  float aberration = edgeFactor * 2.5;
  half4 colorR = image.eval(refractedUV - normal * aberration);
  half4 colorG = image.eval(refractedUV);
  half4 colorB = image.eval(refractedUV + normal * aberration);
  half4 backdropColor = half4(colorR.r, colorG.g, colorB.b, 1.0);

  // Dark translucent glass tint over the distorted backdrop.
  half4 glassTint = half4(0.09, 0.07, 0.12, 1.0);
  half4 composited = mix(backdropColor, glassTint, 0.5);

  // Specular highlight following 'lightAngle' (an animated angle today —
  // swap the uniform's source for a gyroscope reading later without
  // touching this shader), plus a slow "wave" so the highlight isn't static.
  float2 lightDir = normalize(lightAngle);
  float rim = clamp(dot(normal, lightDir), 0.0, 1.0);
  float wave = 0.5 + 0.5 * sin(time * 1.4 + dot(p, float2(0.015, 0.01)));
  float specular = pow(rim, 6.0) * edgeFactor * (0.6 + 0.4 * wave);
  composited.rgb += specular * 0.9;

  // Faint inner glow fading from the border.
  composited.rgb += edgeFactor * 0.12;

  return composited;
}
`

const effect = Skia.RuntimeEffect.Make(SHADER_SOURCE)
if (!effect) {
  throw new Error('LiquidGlassTripCard: failed to compile the liquid-glass SkSL shader')
}

export interface LiquidGlassTripCardProps {
  fromLocation: string
  toLocation: string
  time: string
  phone: string
  status: TripStatus
  onPress?: () => void
  children?: ReactNode
}

// Liquid-glass ride card — the border/edge effect (refraction, chromatic
// aberration, animated specular) is a real Skia SkSL runtime shader, not the
// BlurView + LinearGradient approximation the rest of the app's "glass"
// components use (see components/LiquidGlass/GlassMaterial.tsx).
//
// Important scope note: a Skia `<Canvas>` is its own isolated render
// surface — a `BackdropFilter` inside it can only distort *other Skia
// content drawn in that same Canvas*, not real React Native views sitting
// behind it in the native view tree (e.g. other cards scrolling underneath).
// That's exactly why the rest of the app uses `expo-blur`'s BlurView for
// glass surfaces instead — BlurView is OS-composited and can see real
// sibling views, Skia's Canvas can't. Distorting *actual* app content behind
// this card would need a live view-snapshot (e.g. `makeImageSnapshot`) fed
// in as the backdrop, which is a separate, heavier integration. Here the
// shader instead distorts a plain gradient drawn earlier in the same
// Canvas — enough to see the refraction/aberration/specular clearly, but a
// stand-in, not real background content.
export function LiquidGlassTripCard({
  fromLocation,
  toLocation,
  time,
  phone,
  status,
  onPress,
  children,
}: LiquidGlassTripCardProps) {
  const statusColor = TRIP_STATUS_COLORS[status]
  const [layout, setLayout] = useState({ width: 0, height: CARD_MIN_HEIGHT })

  const clockTime = useSharedValue(0)
  useFrameCallback(frameInfo => {
    clockTime.value = (frameInfo.timeSinceFirstFrame ?? 0) / 1000
  })

  // Light angle sweeps slowly around the card by default. To bind this to
  // the device's gyroscope instead (expo-sensors' `Gyroscope`), replace this
  // derived value with one fed by the sensor's x/y reading — the shader
  // itself doesn't change, it just consumes whatever `lightAngle` is given.
  const uniforms = useDerivedValue(() => {
    const angle = clockTime.value * 0.6
    return {
      resolution: [layout.width, layout.height],
      cornerRadius: CORNER_RADIUS,
      time: clockTime.value,
      lightAngle: [Math.cos(angle), Math.sin(angle)],
    }
  }, [layout.width, layout.height])

  const clip = useMemo(
    () => Skia.RRectXY(Skia.XYWHRect(0, 0, layout.width, layout.height), CORNER_RADIUS, CORNER_RADIUS),
    [layout.width, layout.height],
  )

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={onPress ? 0.75 : 1}
      disabled={!onPress}
      style={{ borderRadius: CORNER_RADIUS, overflow: 'hidden' }}
    >
      <View
        style={{ minHeight: CARD_MIN_HEIGHT, borderRadius: CORNER_RADIUS, overflow: 'hidden' }}
        onLayout={e => setLayout({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}
      >
        {layout.width > 0 && (
          <Canvas style={StyleSheet.absoluteFillObject} pointerEvents="none">
            {/* Stand-in "background" this demo distorts — see the scope
                note above for why this isn't the real app content behind
                the card. */}
            <Fill>
              <SkiaLinearGradient
                start={vec(0, 0)}
                end={vec(layout.width, layout.height)}
                colors={['#2a1448', '#401f68', '#7c5b9c']}
              />
            </Fill>
            {/* Non-null assertion: `effect` is validated once at module load
                (throws if compilation failed) — see the guard above. */}
            <BackdropFilter clip={clip} filter={<RuntimeShader source={effect!} uniforms={uniforms} />} />
          </Canvas>
        )}

        <XStack alignItems="center" gap="$3" padding="$3" zIndex={1}>
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: 'rgba(22,101,52,0.9)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="car" size={20} color="#ffffff" />
          </View>
          <YStack flex={1} gap="$1">
            <Text color="#ffffff" fontSize="$3" fontWeight="700" numberOfLines={1}>
              {fromLocation} → {toLocation}
            </Text>
            <Text color="#c7c7cc" fontSize={12} numberOfLines={1}>
              {time} · {phone}
            </Text>
          </YStack>
          <Badge label={TRIP_STATUS_LABELS[status]} backgroundColor={statusColor.bg} color={statusColor.text} />
        </XStack>
        {children}
      </View>
    </TouchableOpacity>
  )
}
