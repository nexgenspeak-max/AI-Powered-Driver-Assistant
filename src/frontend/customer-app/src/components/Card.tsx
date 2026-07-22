import { styled, View, useThemeName, type GetProps } from 'tamagui'
import { GlassSheen, getGlassShadow } from './LiquidGlass'
import { authGlassTheme } from '../theme'

// "Neo Glass + Soft Dark" card — no visible border, definition comes purely
// from a soft dark shadow (per spec: "No visible borders", "Very soft shadow").
const CardFrame = styled(View, {
  backgroundColor: '$surfaceElevated',
  borderRadius: '$card',
  padding: '$4',
  // Without this, only GlassSheen's own inner clip stays rounded — any other
  // child (e.g. a status-color icon circle sized to the card's edge) can
  // poke past the corner radius instead of staying inside one consistent
  // rounded silhouette.
  overflow: 'hidden',
})

type CardProps = GetProps<typeof CardFrame> & {
  /** 'strong' floats the card further off its background — for cards sitting
   *  directly on a near-black/near-white screen bg (e.g. the auth screens)
   *  instead of the usual mid-tone `$surface`, where the default shadow
   *  reads as too faint to separate the two. */
  shadowIntensity?: 'normal' | 'strong'
}

// Stronger than getGlassShadow — bigger offset/blur, higher opacity — for a
// card that needs to visibly float off a screen background with little
// contrast of its own to lean on (auth screens' near-black/near-white bg,
// vs. the mid-tone `$surface` every other Card sits on). Reads from the
// shared auth theme tokens (see ../theme.ts) since this variant exists
// specifically for those screens.
function getStrongGlassShadow(isLight: boolean) {
  const s = authGlassTheme.card.shadow
  return {
    shadowColor: s.color,
    shadowOffset: { width: 0, height: isLight ? s.offsetY.light : s.offsetY.dark },
    shadowOpacity: isLight ? s.opacity.light : s.opacity.dark,
    shadowRadius: isLight ? s.radius.light : s.radius.dark,
    elevation: isLight ? s.elevation.light : s.elevation.dark,
  } as const
}

// Same single view/props contract as before (styled `View` alias), plus a
// static glass wash (top-lighter/bottom-dimmer fill) drawn behind the content
// — see LiquidGlass.tsx `GlassSheen`. No border ring: on a flat rectangle
// with a small corner radius, the gradient border reads as a bright "spike"
// right at the corner instead of a smooth highlight, and this shape has no
// visible border by design anyway ("no visible borders — very soft shadow").
//
// Uses `GlassSheen` (a decorative absolute-fill overlay), not `GlassMaterial`
// — `GlassMaterial`'s own layers are all absolutely positioned, so it never
// gains a size from its children; it only works when the caller passes an
// explicit width/height. Wrapping CardFrame in it collapsed every Card in
// the app to 0x0 (blank screens everywhere Card is used).
export function Card({ children, shadowIntensity = 'normal', borderRadius, ...props }: CardProps) {
  const isLight = useThemeName() === 'light'
  const shadow = shadowIntensity === 'strong' ? getStrongGlassShadow(isLight) : getGlassShadow(isLight)
  // GlassSheen's own clip has to match CardFrame's actual radius or the wash
  // pokes a visible square corner past the card's rounded silhouette — only
  // matters for callers overriding the default via a plain number (the
  // common case here); a Tamagui token string falls back to the old
  // hardcoded 24, same as before this prop existed.
  const sheenRadius = typeof borderRadius === 'number' ? borderRadius : 24
  return (
    <CardFrame borderRadius={borderRadius} {...props} {...shadow}>
      <GlassSheen borderRadius={sheenRadius} withBorder={false} />
      {children}
    </CardFrame>
  )
}
