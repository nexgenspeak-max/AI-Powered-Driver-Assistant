// Barrel — keeps every existing `from '.../components/LiquidGlass'` import
// working unchanged after splitting the old single 265-line file into
// single-responsibility modules (visual components / gesture hook / glow).
export {
  GlassMaterial,
  GlassSheen,
  GLASS_SHADOW,
  GLASS_BORDER_COLOR,
  GLASS_BORDER_TOP_COLOR,
  getGlassShadow,
  getConcentricRadius,
  type GlassMaterialProps,
  type GlassSheenProps,
} from './GlassMaterial'
export { useGlassPress, liquidGlassTransform } from './useGlassPress'
export { GlowOverlay, type GlowOverlayProps } from './GlowOverlay'
