import { forwardRef } from 'react'
import type { View as RNView } from 'react-native'
import { View, type ViewProps, useThemeName } from 'tamagui'
import { getElevation, type ElevationLevel } from '../theme/elevation'

// The default content container for anything that sits ON a screen: list rows,
// cards, form panels, the profile menu, the earnings sheet. Opaque
// `$surfaceElevated` fill + a soft `boxShadow` (see theme/elevation.ts) — NO
// blur, NO shader. Glass is reserved for floating layers (GlassPanel): the tab
// bar, map overlays, banners.
//
// Replaces GlassSurface. `cornerRadius` and `outline` are accepted as aliases
// so the swap from <GlassSurface> is a straight rename.
//
// Duplicated in customer-app/src/components/Surface.tsx.

const CARD_RADIUS = 24

export type SurfaceProps = ViewProps & {
  /** Shadow depth. 'none' for a nested surface that shouldn't cast its own. */
  level?: ElevationLevel | 'none'
  /** Clip children to the rounded corners (for edge-to-edge media / dividers).
   *  Off by default so the shadow is never at risk of being clipped. */
  clip?: boolean
  /** Alias for `borderRadius` (GlassSurface compat). */
  cornerRadius?: number
  /** Flat card for settings-style groups: same fill as a Surface, no shadow,
   *  no border (the old 1px transparent outline read as a debug box). */
  flat?: boolean
}

export const Surface = forwardRef<RNView, SurfaceProps>(function Surface(
  { level = 'md', clip = false, cornerRadius, flat = false, style, ...rest },
  ref,
) {
  const isLight = useThemeName() === 'light'
  const effectiveLevel = flat ? 'none' : level
  const shadow = effectiveLevel === 'none' ? null : getElevation(effectiveLevel, isLight)
  return (
    <View
      ref={ref}
      backgroundColor="$surfaceElevated"
      // Number, not the '$card' radius token: the theme also has a *color*
      // named `card`, which shadows the token, so the radius silently dropped
      // (square cards on every Surface that didn't pass its own radius).
      borderRadius={cornerRadius ?? CARD_RADIUS}
      overflow={clip ? 'hidden' : 'visible'}
      {...rest}
      style={[shadow, style]}
    />
  )
})
