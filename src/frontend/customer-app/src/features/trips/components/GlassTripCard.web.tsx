import { useMemo } from "react";
import { StyleSheet, TouchableOpacity, View as RNView } from "react-native";
import { Text, XStack, YStack, View, useThemeName, useTheme } from "tamagui";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Badge } from "../../../components/Badge";
import {
  TRIP_STATUS_LABELS,
  TRIP_STATUS_COLORS,
} from "../../../constants/status";
import { formatDate } from "../../../utils/format";
import { randomSpecularVariation } from "../../../utils/glassSpecular";
import type { Trip } from "../../../types";

const CORNER_RADIUS = 28;
const CARD_MIN_HEIGHT = 88;
const BASE_LIGHT_SPECULAR_ANGLE_DEG = -19;

// Outer drop shadow — kept identical to GlassTripCard.tsx's
// getCardOuterShadow (see the long comment there for the reasoning: local
// to this card rather than the shared getGlassShadow, X-offset locked to 0,
// no spread). RN Web compiles shadow*/elevation to a single CSS `box-
// shadow: offsetX offsetY blur color` on this same bordered element, so it
// already follows this element's own border-radius — no separate shadow
// path to keep in sync with the card body. Light needs a visibly *darker*
// shadow than dark — a white card on a near-white page has no natural
// contrast otherwise.
function getCardOuterShadow(isLight: boolean) {
  return {
    shadowColor: isLight ? "#8B5CF6" : "#000000",
    shadowOffset: { width: 0, height: isLight ? 12 : 8 },
    // Light carries *all* of the card's elevation cue now that its inner
    // top shadow is gone — bumped further than before to compensate.
    shadowOpacity: isLight ? 0.28 : 0.16,
    shadowRadius: isLight ? 26 : 22,
    elevation: isLight ? 7 : 6,
  } as const;
}

// Web fallback — `@shopify/react-native-skia` needs its own CanvasKit/WASM
// setup to run on web (not automatic with Expo Router web builds, same
// tradeoff as LiquidGlassTripCard.web.tsx), so the SkSL inner-shadow +
// specular shader in GlassTripCard.tsx doesn't run here. This approximates
// the same two cues with plain gradients: a top-down dark LinearGradient for
// the inner shadow, and a small radial-gradient glow (CSS `backgroundImage`,
// web-only) for the specular highlight.
//
// A rotated `LinearGradient` box was tried first and rejected — it only
// fades along one axis, so the edges perpendicular to that axis stay at
// (near-)full opacity all the way to the box's own boundary. Once that
// oversized box got clipped by the card's rounded corner, that hard,
// still-opaque edge was visible cutting across the card as a straight seam.
// A radial gradient fades in every direction from its center, so nothing
// reaches the clip boundary at anything but ~0 opacity — no seam regardless
// of size/position/clip alignment.
const THEME_PARAMS = {
  dark: {
    washColors: ["rgba(33,27,40,0.94)", "rgba(32,26,39,0.94)"] as const, // near-flat, matches the old solid fill
    topShadowColors: ["rgba(0,0,0,0.34)", "rgba(0,0,0,0)"] as const,
    bottomHighlightColors: [
      "rgba(255,255,255,0)",
      "rgba(255,255,255,0)",
    ] as const,
    specularPeak: "rgba(255,255,255,0.15)",
  },
  light: {
    washColors: ["rgba(255,255,255,0.97)", "rgba(230,230,234,0.92)"] as const, // #FFFFFF -> #E6E6EA
    // Inner top shadow removed per spec — light now floats via outer
    // shadow alone (transparent-to-transparent below is a no-op).
    topShadowColors: ["rgba(0,0,0,0)", "rgba(0,0,0,0)"] as const,
    bottomHighlightColors: [
      "rgba(255,255,255,0)",
      "rgba(255,255,255,0.55)",
    ] as const,
    // Softer/fainter than before (0.55 -> 0.2) — paired with a bigger blob
    // below, this reads as a diffuse glow instead of a crisp bright blob.
    specularPeak: "rgba(255,255,255,0.2)",
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
  // Rolled once per mounted card instance — each card in the list keeps its
  // own randomized glint for its whole lifetime.
  const lightVariation = useMemo(
    () => randomSpecularVariation(BASE_LIGHT_SPECULAR_ANGLE_DEG),
    [],
  );
  const specularTop = isLight
    ? `${-15 + lightVariation.offsetY * 40}%`
    : "-10%";
  const specularLeft = isLight
    ? `${15 + lightVariation.offsetX * 40}%`
    : "-12%";
  const specularRotation = isLight ? `${lightVariation.angleDeg}deg` : "-24deg";

  return (
    // Single outermost touchable, matching GlassTripCard.tsx's structure —
    // onPress, sizing, borderRadius/overflow, and background all live on
    // this one node so there's exactly one hit target covering exactly the
    // visible card. The gradient overlays below are direct children with
    // pointerEvents="none", never a separately-sized wrapper.
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
    >
      {/* Two-stop vertical wash — this card's own background (was a flat
          backgroundColor before; light mode's #FFFFFF -> #E6E6EA reference
          needs a real gradient). */}
      <LinearGradient
        colors={params.washColors}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      {/* Inner top shadow — concave lip cue. */}
      <LinearGradient
        colors={params.topShadowColors}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.65 }}
        style={StyleSheet.absoluteFillObject}
        pointerEvents="none"
      />
      {/* Bottom inset highlight — thin bright line, light-mode-only (dark's
          colors are transparent-to-transparent, a no-op). */}
      <LinearGradient
        colors={params.bottomHighlightColors}
        start={{ x: 0.5, y: 0.94 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFillObject}
        pointerEvents="none"
      />
      {/* Specular highlight — small radial glow anchored in the top-left
          (well under 40% of the card's width), feathered to fully
          transparent long before its own box edge so the rounded-corner
          clip never cuts across a still-visible region. */}
      <RNView
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          borderRadius: CORNER_RADIUS,
          overflow: "hidden",
        }}
        pointerEvents="none"
      >
        <RNView
          style={
            {
              position: "absolute",
              top: specularTop,
              left: specularLeft,
              // Bigger in light mode — a larger blob at a fainter peak
              // reads as soft/diffuse instead of a small crisp glint.
              width: isLight ? "60%" : "42%",
              height: isLight ? "60%" : "42%",
              transform: [{ rotate: specularRotation }],
              // Web-only CSS escape hatch (not part of RN's ViewStyle) — a
              // true radial fade, which `expo-linear-gradient` can't do.
              backgroundImage: `radial-gradient(ellipse at 40% 40%, ${params.specularPeak} 0%, rgba(255,255,255,0) 70%)`,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } as any
          }
        />
      </RNView>

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
