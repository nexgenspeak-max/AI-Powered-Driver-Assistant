import { memo } from 'react'
import type { StyleProp, ViewStyle } from 'react-native'
import Svg, { Circle, Path } from 'react-native-svg'
import { GLYPHS, type IconName } from './glyphs'

export type { IconName }

/** Stroke on the 24-unit grid — 1.75 reads as "regular" at 20–24pt. */
const STROKE = 1.75
const STROKE_ACTIVE = 2
/** Tint of `body` parts in the active (selected) state. */
const BODY_TINT = 0.22

/**
 * Czen's own icon set (see glyphs.ts for the drawing rules). Same call shape
 * as the font icons it replaces — `name`, `size`, `color` — plus `active`
 * for the duotone selected state used by the tab bar.
 */
export const Icon = memo(function Icon({
  name,
  size = 24,
  color = '#000',
  active = false,
  strokeWidth,
  style,
}: {
  name: IconName
  size?: number
  color?: string
  active?: boolean
  strokeWidth?: number
  style?: StyleProp<ViewStyle>
  /** Accepted for drop-in parity with font icons; the SVG never takes touches. */
  pointerEvents?: string
}) {
  // The stroke is in grid units, so it thins as the icon shrinks — 1.75 at
  // 14pt renders ~1pt and reads weaker than its 24pt siblings. Compensate
  // so small inline icons (stat labels, meta rows) keep the same weight.
  const optical = size <= 16 ? 0.35 : size <= 20 ? 0.15 : 0
  const sw = strokeWidth ?? (active ? STROKE_ACTIVE : STROKE) + optical
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" style={style} pointerEvents="none">
      {GLYPHS[name].map((p, i) => {
        const fill = 'dot' in p && p.dot ? color : active && p.body ? color : 'none'
        const fillOpacity = 'dot' in p && p.dot ? 1 : BODY_TINT
        const common = {
          stroke: 'dot' in p && p.dot ? 'none' : color,
          strokeWidth: sw,
          strokeLinecap: 'round' as const,
          strokeLinejoin: 'round' as const,
          fill,
          fillOpacity,
        }
        return 'd' in p ? <Path key={i} d={p.d} {...common} /> : <Circle key={i} cx={p.cx} cy={p.cy} r={p.r} {...common} />
      })}
    </Svg>
  )
})
