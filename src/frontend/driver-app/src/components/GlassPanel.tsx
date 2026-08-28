import type { ReactNode } from 'react'
import { StyleSheet, View as RNView, type ViewStyle } from 'react-native'
import { BlurView } from 'expo-blur'
import { useThemeName } from 'tamagui'
import { GlassSheen } from './LiquidGlass'
import { getElevation } from '../theme/elevation'

// The ONLY frosted-glass container after this redesign. Reserved for layers
// that genuinely float over other content — the tab bar, map overlays
// (NavigationHud, OptimizedRoutePanel), the trip-offer banner, the assistant
// chat panel. Screen content uses the opaque <Surface> instead.
//
// Unlike GlassMaterial it does NOT center its children — it's a plain container
// you lay out yourself. Real native blur + the shared GlassSheen wash/border +
// `elevation.lg`.
//
// Duplicated in customer-app/src/components/GlassPanel.tsx.

export type GlassPanelProps = {
  children?: ReactNode
  borderRadius?: number
  /** expo-blur intensity. */
  intensity?: number
  style?: ViewStyle | ViewStyle[]
}

export function GlassPanel({
  children,
  borderRadius = 24,
  intensity = 50,
  style,
}: GlassPanelProps) {
  const isLight = useThemeName() === 'light'
  return (
    // Outer view carries the shadow (no clip); inner clips the blur/wash to the
    // rounded corners — same split every glass surface in this codebase uses to
    // dodge Android's overflow-clips-shadow quirk.
    <RNView style={[getElevation('lg', isLight), { borderRadius }, style]}>
      <RNView style={{ borderRadius, overflow: 'hidden' }}>
        <BlurView
          tint={isLight ? 'light' : 'dark'}
          intensity={intensity}
          experimentalBlurMethod="dimezisBlurView"
          style={StyleSheet.absoluteFill}
        />
        <GlassSheen borderRadius={borderRadius} />
        {children}
      </RNView>
    </RNView>
  )
}
