import { type ReactNode, useMemo } from "react";
import { StyleSheet, View, type ViewStyle } from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { useThemeName } from "tamagui";

// Frosted-glass surface ported from the actual working reference —
// https://github.com/SchroederNathan/linear-tab-bar (GlassMaterial.tsx) —
// after an earlier attempt at faking this with a hand-written Skia SDF shader
// produced oversized, wrong-looking blobs on anything taller than it was
// tuned for. This version uses only well-tested primitives: a real native
// blur, a plain top-lighter/bottom-dimmer gradient wash, and a genuine 1px
// gradient-colored edge (via MaskedView) instead of computed distance fields.

const FILL_GRADIENT_START = { x: 0.5, y: 0 };
const FILL_GRADIENT_END = { x: 0.5, y: 1 };
// Fast falloff (locations) instead of an even 0->1 ramp — reads as a bright
// glossy strip hugging the top edge, then settles to the faint wash below,
// matching a physical glass/acrylic surface catching light from above.
const GLASS_GRADIENT_LOCATIONS = [0, 0.35, 1] as const;

// elevation:14/opacity:0.45/radius:24 (a previous pass) is modal/FAB-strength
// — on small elements (buttons, back button, tab pill) it doesn't read as a
// soft shadow, it paints a solid dark patch behind the content, worse in
// dark mode since it doesn't fade into the already-dark background. Tuned
// down to card/button-strength instead.
export function getGlassShadow(isLight: boolean) {
  return {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: isLight ? 10 : 6 },
    shadowOpacity: isLight ? 0.24 : 0.28,
    shadowRadius: isLight ? 20 : 14,
    elevation: isLight ? 8 : 5,
  } as const;
}
// kept for backwards compatibility if needed, but not used internally now
export const GLASS_SHADOW = {
  shadowColor: "#000000",
  shadowOffset: { width: 0, height: 12 },
  shadowOpacity: 0.18,
  shadowRadius: 24,
  elevation: 14,
} as const;

// Single source of truth for every "kính" (frosted glass) surface's border
// color — Card/Badge/SearchInput/Input (via GlassSheen), Button's non-primary
// variants and the tab bar (LiquidGlassTabBar, both platforms) all rendered
// the exact same rgba values as separate hardcoded literals before, which
// only stayed in sync by coincidence. Centralized here so they can't drift
// apart again. Uniform on all four sides — a brighter top edge was tried as
// a "light reflection" cue but read as an unbalanced/lopsided border, so the
// top-vs-rest split was removed. Deliberately NOT used by the purple/green/
// red CTA buttons (GlassButton, Button's primary/success/danger) or
// GlassSurface's flat `outline` mode — those are each a different, already-
// documented "shadow/border matches this element's own fill color" language,
// not generic glass.
export const GLASS_BORDER_COLOR = {
  light: "rgba(255, 255, 255, 0.35)",
  dark: "rgba(255, 255, 255, 0.1)",
} as const;

// Apple-style concentric nesting: a rounded shape inset by `padding` inside
// a container of `outerRadius` should itself use `outerRadius - padding` so
// both curves share the same center — not a fixed/guessed constant, which
// drifts out of sync the moment either size changes.
export function getConcentricRadius(outerRadius: number, padding: number) {
  return Math.max(0, outerRadius - padding);
}

// Static top-left corner glint removed per spec (was light-mode-only,
// randomized position/size via randomSpecularVariation) — every card/badge/
// input/button using GlassSheen or GlassMaterial no longer shows it.

// The gradient wash + gradient border, factored out so it can be used two
// ways: as a full owning container (`GlassMaterial`, for components like
// BackButton/TabBar/Button that build their own box from scratch) or as a
// pure decorative overlay (`GlassSheen`, for Card/Badge — generic Tamagui
// pass-through components whose size/padding/background must keep resolving
// through Tamagui's own prop system, not a wrapping RN View).
//
// The gradient border reads brightness purely from Y position, so at a small
// corner radius on a wide/flat rectangle (Card) the arc crosses that vertical
// gradient fast, over a very short curve — it reads as a bright "spike" right
// at the corner instead of a smooth highlight. Pill shapes (Badge, Button,
// tab bar — radius = half the height) don't show it because there's no short
// tight corner, just one continuous curve. `withBorder` lets flat-cornered
// surfaces skip the border and keep only the wash.
function GlassGradientLayers({
  borderRadius,
  withBorder = true,
  intensity = "normal",
}: {
  borderRadius: number;
  withBorder?: boolean;
  /** 'strong' for small elements (icon badges, chips) where the toned-down
   *  'normal' dark-mode wash is too faint to read at all. Only affects dark
   *  mode — light mode's wash never had the tall-card banding problem below. */
  intensity?: "normal" | "strong";
}) {
  const themeName = useThemeName();
  const isLight = themeName === "light";
  const strong = intensity === "strong";

  // iOS 26 Liquid Glass style:
  // Pure white translucent washes for a clean frost aesthetic.
  // Purple tint is kept strictly to the shadows as requested.
  //
  // Light-mode values toned back down from an earlier pass (0.7/0.3 top/mid,
  // 0.9 top-border) — that bright a glare sitting on top of white CTA text
  // (primary Button, active tab pill) made the label nearly disappear into
  // the sheen. This keeps the glass visible without competing with text.
  //
  // Dark mode sits on an *opaque* card background (`$surfaceElevated`), so
  // unlike light mode (white-on-white ≈ invisible) this wash is genuinely
  // visible — on a short button that reads as a nice sheen, but stretched
  // over a tall card (a full-screen modal card, say) the top 35%
  // vs. the rest banded into two visibly different shades, like two panels
  // stacked instead of one surface. Halved so it stays a hint, not a band —
  // but that same halved value on a small 40-ish px badge is nearly
  // invisible, so those pass `intensity="strong"` for a brighter wash sized
  // for how little vertical room it has to fade across.
  const topColor = isLight
    ? "rgba(255,255,255,0.35)"
    : strong
      ? "rgba(255,255,255,0.22)"
      : "rgba(255,255,255,0.08)";
  const midColor = isLight
    ? "rgba(255,255,255,0.12)"
    : strong
      ? "rgba(255,255,255,0.1)"
      : "rgba(255,255,255,0.03)";
  const bottomColor = isLight
    ? "rgba(255,255,255,0.03)"
    : strong
      ? "rgba(255,255,255,0.04)"
      : "rgba(255,255,255,0.015)";

  const borderBright = isLight
    ? "rgba(255,255,255,0.8)"
    : "rgba(168,85,247,0.5)";
  const borderDim = isLight ? "rgba(255,255,255,0.2)" : "rgba(124,91,156,0.08)";

  return (
    <>
      <LinearGradient
        colors={[topColor, midColor, bottomColor]}
        locations={GLASS_GRADIENT_LOCATIONS}
        start={FILL_GRADIENT_START}
        end={FILL_GRADIENT_END}
        style={StyleSheet.absoluteFill}
      />

      {/*
        Cross-platform Glass Border: 
        MaskedView fails on React Native Web and renders a solid black line. 
        Replaced with a solid translucent border which works perfectly on Web/iOS/Android. 
        To simulate the top-light effect, we can use a top border color and left/right/bottom differently,
        but for simplicity and rounded corners, a unified translucent border does the glass job effectively.
      */}
      {withBorder && (
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              borderRadius,
              // Same 1px, same color, on all four sides — was borderTopWidth:
              // 1.5 plus a brighter top-only color, both of which read as a
              // lopsided/unbalanced border instead of a clean thin outline.
              borderWidth: 1,
              borderColor: isLight ? GLASS_BORDER_COLOR.light : GLASS_BORDER_COLOR.dark,
            },
          ]}
          pointerEvents="none"
        />
      )}
    </>
  );
}

export interface GlassMaterialProps {
  children?: ReactNode;
  style?: ViewStyle | ViewStyle[];
  borderRadius?: number;
  tint?: "light" | "dark";
  blurIntensity?: number;
  /** Set false to skip the built-in floating shadow — e.g. when a parent view already owns one. */
  shadow?: boolean;
}

// Owns its own box (size comes from `style`/flex, not a measured width/height)
// — for components that build their visual entirely themselves: BackButton,
// the tab bar pill, the chat input pill, primary Button.
//
// Split into two nested Views because RN clips shadows on any view that also
// sets `overflow: hidden` — the outer view owns size + shadow (no clipping),
// the inner one owns the borderRadius clip for the blur/gradient layers.
export function GlassMaterial({
  children,
  style,
  borderRadius = 24,
  tint,
  blurIntensity = 50, // Slightly higher for more pronounced frost
  shadow = true,
}: GlassMaterialProps) {
  const themeName = useThemeName();
  const isLight = themeName === "light";
  const resolvedTint = tint || (isLight ? "light" : "dark");

  const fill = useMemo(
    () => [
      StyleSheet.absoluteFill,
      { borderRadius, overflow: "hidden" as const },
    ],
    [borderRadius],
  );

  return (
    <View
      style={[shadow && getGlassShadow(isLight), { borderRadius }, style]}
      collapsable={false}
    >
      <View style={{ flex: 1, borderRadius, overflow: "hidden" }}>
        {/* `experimentalBlurMethod="dimezisBlurView"` — Android otherwise
            falls back to a plain semi-transparent tint (expo-blur's own
            documented default there) instead of actually blurring whatever's
            behind this surface; iOS already blurs real content natively and
            ignores this prop. */}
        <BlurView
          tint={resolvedTint}
          intensity={blurIntensity}
          experimentalBlurMethod="dimezisBlurView"
          style={fill}
        />
        <GlassGradientLayers borderRadius={borderRadius} />
        <View
          style={[
            StyleSheet.absoluteFillObject,
            { alignItems: "center", justifyContent: "center" },
          ]}
          pointerEvents="box-none"
        >
          {children}
        </View>
      </View>
    </View>
  );
}

export interface GlassSheenProps {
  borderRadius?: number;
  /** Set false for flat-cornered rectangles (Card) — see note on `GlassGradientLayers`. */
  withBorder?: boolean;
  style?: ViewStyle;
  /** 'strong' for small elements (icon badges, chips) — see `GlassGradientLayers`. */
  intensity?: "normal" | "strong";
}

// Decorative-only, absolute-fill, no blur and no box of its own — drop this
// as the first child of a component whose outer frame already handles size,
// background and shadow (Card, Badge). No blur because these sit on a flat
// background; blurring nothing behind them added no visual value and made
// the surface underneath harder to read.
export function GlassSheen({
  borderRadius = 24,
  withBorder = true,
  style,
  intensity = "normal",
}: GlassSheenProps) {
  return (
    <View
      style={[
        StyleSheet.absoluteFillObject,
        { borderRadius, overflow: "hidden" },
        style,
      ]}
      pointerEvents="none"
    >
      <GlassGradientLayers
        borderRadius={borderRadius}
        withBorder={withBorder}
        intensity={intensity}
      />
    </View>
  );
}
