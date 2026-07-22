import { useMemo, useState, type ReactNode } from "react";
import { TouchableOpacity, View as RNView, StyleSheet } from "react-native";
import { useTheme, useThemeName } from "tamagui";
import { LinearGradient } from "expo-linear-gradient";
import { randomSpecularVariation } from "../utils/glassSpecular";

const DEFAULT_CORNER_RADIUS = 18;
const BASE_LIGHT_SPECULAR_ANGLE_DEG = -19;

function getSurfaceOuterShadow(isLight: boolean) {
  return {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: isLight ? 12 : 6 },
    // Light mode carries *all* of the card's elevation cue now that its
    // inner top shadow is gone — bumped further than before to compensate.
    shadowOpacity: isLight ? 0.28 : 0.2,
    shadowRadius: isLight ? 26 : 18,
    elevation: isLight ? 7 : 4,
  } as const;
}

// Web fallback — same reasoning as GlassBookingInput.web.tsx: no Skia on
// Expo web, so the wash + top-shadow + specular shader is approximated with
// plain gradients (the wash *is* the surface's own LinearGradient
// background here, a top-down LinearGradient for the inner shadow, and a
// randomized-per-instance radial glow). Light drops the inner top-shadow
// gradient entirely (transparent-to-transparent, a no-op) — it now reads as
// "floating above the page" via outer shadow alone. Dark is untouched
// (unaffected by this light-mode-only pass).
const THEME_PARAMS = {
  dark: {
    washColors: ["rgba(255,255,255,0.09)", "rgba(255,255,255,0.05)"] as const,
    topShadowColors: ["rgba(0,0,0,0.22)", "rgba(0,0,0,0)"] as const,
    bottomHighlightColors: [
      "rgba(255,255,255,0)",
      "rgba(255,255,255,0)",
    ] as const,
    // Specular top-left glint removed per spec — transparent-to-transparent
    // is a no-op for the radial-gradient it feeds, kept (not deleted) so
    // re-enabling it later is a one-line change.
    specularPeak: "rgba(255,255,255,0)",
  },
  light: {
    washColors: ["rgba(255,255,255,0.97)", "rgba(230,230,234,0.92)"] as const,
    topShadowColors: ["rgba(0,0,0,0)", "rgba(0,0,0,0)"] as const,
    bottomHighlightColors: [
      "rgba(255,255,255,0)",
      "rgba(255,255,255,0.55)",
    ] as const,
    specularPeak: "rgba(255,255,255,0)",
  },
};

export interface GlassSurfaceProps {
  cornerRadius?: number;
  /** See GlassSurface.tsx — overrides the bottom two corners independently. */
  bottomCornerRadius?: number;
  onPress?: () => void;
  style?: { flex?: number; [key: string]: unknown };
  children?: ReactNode;
  /** See GlassSurface.tsx — fully transparent interior + flat 1px
   *  `$borderStrong` border, no wash/specular/shadow at all. Was silently
   *  ignored on web before (this file never implemented it), so `outline`
   *  callers still rendered the full glass treatment on web specifically. */
  outline?: boolean;
}

export function GlassSurface({
  cornerRadius = DEFAULT_CORNER_RADIUS,
  bottomCornerRadius = cornerRadius,
  onPress,
  style,
  children,
  outline = false,
}: GlassSurfaceProps) {
  const isLight = useThemeName() === "light";
  const theme = useTheme();
  const params = isLight ? THEME_PARAMS.light : THEME_PARAMS.dark;
  const [height, setHeight] = useState(0);
  // Rolled once per mounted instance — each surface keeps its own
  // randomized glint position/angle for its whole lifetime.
  const lightVariation = useMemo(
    () => randomSpecularVariation(BASE_LIGHT_SPECULAR_ANGLE_DEG),
    [],
  );
  // Heuristic mapping from the native shader's center-relative offsetX/Y
  // (-0.55..0.55 / -0.55..0.15) to this box's top-left-relative percentages
  // — doesn't need to match pixel-for-pixel, just cover the same "left,
  // center, or right / mostly-upper" spread the native version does.
  const specularTop = isLight ? `${10 + lightVariation.offsetY * 40}%` : "-10%";
  const specularLeft = isLight
    ? `${20 + lightVariation.offsetX * 40}%`
    : "-12%";
  const specularRotation = isLight ? `${lightVariation.angleDeg}deg` : "-24deg";

  const cornerStyle = {
    borderTopLeftRadius: cornerRadius,
    borderTopRightRadius: cornerRadius,
    borderBottomLeftRadius: bottomCornerRadius,
    borderBottomRightRadius: bottomCornerRadius,
  };

  // Same flat 1px border as the outline Button variant, resolved to a
  // literal hex here since this is a plain RN View, not a Tamagui one.
  const outlineBorderStyle = outline
    ? { borderWidth: 1, borderColor: theme.borderStrong.val }
    : null;

  // `outline` skips the wash/shadow/specular overlays entirely — no fill of
  // any opacity, matching the outline Button's genuinely transparent
  // interior rather than just a lighter glass tint.
  const overlays = outline ? null : (
    <>
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
        end={{ x: 0.5, y: 0.6 }}
        style={StyleSheet.absoluteFillObject}
        pointerEvents="none"
      />
      {/* Bottom inset highlight — thin bright line hugging the bottom edge,
          light-mode-only (dark's colors are transparent-to-transparent, a
          no-op). Short end-stop (0.94) keeps it a crisp line rather than a
          broad wash like the top-shadow gradient above. */}
      <LinearGradient
        colors={params.bottomHighlightColors}
        start={{ x: 0.5, y: 0.94 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFillObject}
        pointerEvents="none"
      />
      <RNView
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          ...cornerStyle,
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
              // Bigger in light mode — add a randomized scale to the blob so
              // highlights don't repeat exactly across cards.
              width: isLight ? `${55 + lightVariation.sizeScale * 18}%` : "42%",
              height: isLight
                ? Math.max(height, 80) * 0.6 * lightVariation.sizeScale
                : Math.max(height, 80) * 0.42,
              transform: [{ rotate: specularRotation }],
              // Web-only CSS escape hatch (not part of RN's ViewStyle).
              backgroundImage: `radial-gradient(ellipse at 40% 40%, ${params.specularPeak} 0%, rgba(255,255,255,0) 70%)`,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } as any
          }
        />
      </RNView>
    </>
  );

  const handleLayout = (e: { nativeEvent: { layout: { height: number } } }) =>
    setHeight(e.nativeEvent.layout.height);

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.85}
        style={[
          { ...cornerStyle, overflow: "hidden" },
          !outline && getSurfaceOuterShadow(isLight),
          outlineBorderStyle,
          style,
        ]}
        onLayout={handleLayout}
      >
        {overlays}
        {children}
      </TouchableOpacity>
    );
  }

  return (
    <RNView style={[cornerStyle, !outline && getSurfaceOuterShadow(isLight), style]}>
      <RNView
        style={[
          { ...cornerStyle, overflow: "hidden", flex: style?.flex },
          outlineBorderStyle,
        ]}
        onLayout={handleLayout}
      >
        {overlays}
        {children}
      </RNView>
    </RNView>
  );
}
