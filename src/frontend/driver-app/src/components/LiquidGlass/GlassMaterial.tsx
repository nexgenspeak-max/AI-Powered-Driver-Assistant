import { type ReactNode, useMemo } from 'react'
import { StyleSheet, View, type ViewStyle } from 'react-native'
import { BlurView } from 'expo-blur'
import { LinearGradient } from 'expo-linear-gradient'
import MaskedView from '@react-native-masked-view/masked-view'

// Frosted-glass surface ported from the actual working reference —
// https://github.com/SchroederNathan/linear-tab-bar (GlassMaterial.tsx) —
// after an earlier attempt at faking this with a hand-written Skia SDF shader
// produced oversized, wrong-looking blobs on anything taller than it was
// tuned for. This version uses only well-tested primitives: a real native
// blur, a plain top-lighter/bottom-dimmer gradient wash, and a genuine 1px
// gradient-colored edge (via MaskedView) instead of computed distance fields.

const FILL_GRADIENT_START = { x: 0.5, y: 0 }
const FILL_GRADIENT_END = { x: 0.5, y: 1 }
const BORDER_GRADIENT_START = { x: 0.49, y: 0 }
const BORDER_GRADIENT_END = { x: 0.51, y: 1 }

const GLASS_GRADIENT_TOP = 'rgba(255,255,255,0.11)'
const GLASS_GRADIENT_BOTTOM = 'rgba(255,255,255,0.05)'
const BORDER_GRADIENT_BRIGHT = 'rgba(255,255,255,0.16)'
const BORDER_GRADIENT_DIM = 'rgba(255,255,255,0.01)'
const BORDER_GRADIENT_MEDIUM = 'rgba(255,255,255,0.06)'

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
function GlassGradientLayers({ borderRadius, withBorder = true }: { borderRadius: number; withBorder?: boolean }) {
  return (
    <>
      <LinearGradient
        colors={[GLASS_GRADIENT_TOP, GLASS_GRADIENT_BOTTOM]}
        start={FILL_GRADIENT_START}
        end={FILL_GRADIENT_END}
        style={StyleSheet.absoluteFill}
      />
      {/* Gradient border: mask a linear-gradient to only show through a 1px border ring */}
      {withBorder && (
        <MaskedView
          style={StyleSheet.absoluteFill}
          maskElement={<View style={{ flex: 1, borderWidth: 1, borderColor: 'black', borderRadius }} />}
          pointerEvents="none"
        >
          <LinearGradient
            colors={[BORDER_GRADIENT_BRIGHT, BORDER_GRADIENT_DIM, BORDER_GRADIENT_MEDIUM]}
            start={BORDER_GRADIENT_START}
            end={BORDER_GRADIENT_END}
            locations={[0, 0.5, 1]}
            style={{ flex: 1 }}
          />
        </MaskedView>
      )}
    </>
  )
}

export interface GlassMaterialProps {
  children?: ReactNode
  style?: ViewStyle | ViewStyle[]
  borderRadius?: number
  tint?: 'light' | 'dark'
  blurIntensity?: number
}

// Owns its own box (size comes from `style`/flex, not a measured width/height)
// — for components that build their visual entirely themselves: BackButton,
// the tab bar pill, the chat input pill, primary Button.
export function GlassMaterial({ children, style, borderRadius = 24, tint = 'dark', blurIntensity = 40 }: GlassMaterialProps) {
  const fill = useMemo(() => [StyleSheet.absoluteFill, { borderRadius, overflow: 'hidden' as const }], [borderRadius])

  return (
    <View style={[{ borderRadius, overflow: 'hidden' }, style]} collapsable={false}>
      <BlurView tint={tint} intensity={blurIntensity} style={fill} />
      <GlassGradientLayers borderRadius={borderRadius} />
      <View
        style={[StyleSheet.absoluteFillObject, { alignItems: 'center', justifyContent: 'center' }]}
        pointerEvents="box-none"
      >
        {children}
      </View>
    </View>
  )
}

export interface GlassSheenProps {
  borderRadius?: number
  /** Set false for flat-cornered rectangles (Card) — see note on `GlassGradientLayers`. */
  withBorder?: boolean
  style?: ViewStyle
}

// Decorative-only, absolute-fill, no blur and no box of its own — drop this
// as the first child of a component whose outer frame already handles size,
// background and shadow (Card, Badge). No blur because these sit on a flat
// background; blurring nothing behind them added no visual value and made
// the surface underneath harder to read.
export function GlassSheen({ borderRadius = 24, withBorder = true, style }: GlassSheenProps) {
  return (
    <View style={[StyleSheet.absoluteFillObject, { borderRadius, overflow: 'hidden' }, style]} pointerEvents="none">
      <GlassGradientLayers borderRadius={borderRadius} withBorder={withBorder} />
    </View>
  )
}
