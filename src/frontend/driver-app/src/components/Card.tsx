import { styled, View, useThemeName, type GetProps } from 'tamagui'
import { GlassSheen, getGlassShadow } from './LiquidGlass'

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

type CardProps = GetProps<typeof CardFrame>

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
export function Card({ children, ...props }: CardProps) {
  const isLight = useThemeName() === 'light'
  return (
    <CardFrame {...props} {...getGlassShadow(isLight)}>
      <GlassSheen borderRadius={24} withBorder={false} />
      {children}
    </CardFrame>
  )
}
