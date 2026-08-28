// Barrel — keeps every existing `from '.../components/LiquidGlass'` import
// working unchanged after splitting the old single 265-line file into
// single-responsibility modules (visual components / gesture hook / glow).
export {
  GlassMaterial,
  GlassSheen,
  GLASS_SHADOW,
  GLASS_BORDER_COLOR,
  getGlassShadow,
  getConcentricRadius,
  type GlassMaterialProps,
  type GlassSheenProps,
} from './GlassMaterial'
export { useGlassPress, liquidGlassTransform } from './useGlassPress'
export { GlowOverlay, type GlowOverlayProps } from './GlowOverlay'

// The one purple CTA gradient — was copy-pasted as `['#6D28D9', '#A855F7']`
// into Button.tsx, GlassButton.tsx and DashboardModeSwitch.tsx. Darkened start
// to match `$primaryPress` (#7C3AED). Import this everywhere a primary
// action/segment needs the brand gradient.
export const CTA_GRADIENT = ['#7C3AED', '#A855F7'] as const
