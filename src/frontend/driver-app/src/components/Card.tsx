import { styled, View, type GetProps } from 'tamagui'
import { GlassSheen } from './LiquidGlass'

// "Neo Glass + Soft Dark" card — no visible border, definition comes purely
// from a soft dark shadow (per spec: "No visible borders", "Very soft shadow").
const CardFrame = styled(View, {
  backgroundColor: '$surfaceElevated',
  borderRadius: '$card',
  padding: '$4',
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.28,
  // No `elevation` — Tamagui derives Android's elevation from the shadow*
  // props above automatically, and explicitly excludes elevation from its
  // style prop types (StackStyleBase omits it) since it manages this itself.
  shadowRadius: 14,
})

type CardProps = GetProps<typeof CardFrame>

// Same single view/props contract as before (styled `View` alias), plus a
// static glass wash (top-lighter/bottom-dimmer fill) drawn behind the content
// — see LiquidGlass.tsx `GlassSheen`. No border ring: on a flat rectangle
// with a small corner radius, the gradient border reads as a bright "spike"
// right at the corner instead of a smooth highlight, and this shape has no
// visible border by design anyway ("no visible borders — very soft shadow").
export function Card({ children, ...props }: CardProps) {
  return (
    <CardFrame {...props}>
      <GlassSheen borderRadius={24} withBorder={false} />
      {children}
    </CardFrame>
  )
}
