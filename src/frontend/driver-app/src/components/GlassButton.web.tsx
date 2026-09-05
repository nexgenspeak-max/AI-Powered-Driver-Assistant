import { useState } from 'react'
import { TouchableOpacity, ActivityIndicator, StyleSheet, View as RNView } from 'react-native'
import { useThemeName } from 'tamagui'
import { LinearGradient } from 'expo-linear-gradient'
import { AppText } from './AppText'

const BUTTON_HEIGHT = 52
// Purple CTA exception: the gradient fill never changes between themes —
// only the glass cues on top of it do (see THEME_PARAMS).
const DEFAULT_GRADIENT_COLORS = ['#6D28D9', '#A855F7'] as const
const DISABLED_COLOR = '#4A4552'

// Dimmer specular + lighter inner shadow for light mode (vs. the white
// cards' much brighter highlight) — reads as an overlay on the brand
// purple rather than fighting it for attention. Dark mode keeps its
// previous fixed values.
// Specular top-left glint removed per spec — transparent specularPeak is a
// no-op for the radial-gradient it feeds, kept (not deleted) so re-enabling
// it later is a one-line change.
const THEME_PARAMS = {
  dark: { topShadowColors: ['rgba(0,0,0,0.22)', 'rgba(0,0,0,0)'] as const, specularPeak: 'rgba(255,255,255,0)', specularAngle: '-24deg' },
  light: { topShadowColors: ['rgba(0,0,0,0.14)', 'rgba(0,0,0,0)'] as const, specularPeak: 'rgba(255,255,255,0)', specularAngle: '-19deg' },
}

function getButtonOuterShadow(isLight: boolean) {
  return {
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: isLight ? 10 : 8 },
    // Light needs it visibly stronger/"rõ" than dark.
    shadowOpacity: isLight ? 0.4 : 0.3,
    shadowRadius: isLight ? 18 : 16,
    elevation: 6,
  } as const
}

export interface GlassButtonProps {
  label: string
  onPress: () => void
  loading?: boolean
  disabled?: boolean
  /** Overrides the purple gradient's two stops — defaults to the app's
   *  standard CTA purple. */
  colors?: readonly [string, string]
}

// Web fallback — same overlay-not-fill idea as GlassButton.tsx: the
// LinearGradient below is the button's real color, this only adds a top
// shadow gradient + a small radial specular glow on top of it, so the
// gradient always shows through (see GlassTripCard.web.tsx for why a radial
// gradient is used instead of a rotated LinearGradient box — it fades in
// every direction, so it can't leave a hard edge visible over the pill).
export function GlassButton({ label, onPress, loading, disabled, colors }: GlassButtonProps) {
  const isLight = useThemeName() === 'light'
  const params = isLight ? THEME_PARAMS.light : THEME_PARAMS.dark
  const isDisabled = !!(disabled || loading)
  const [height, setHeight] = useState(BUTTON_HEIGHT)

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.85}
      style={[
        { minHeight: BUTTON_HEIGHT, width: '100%', borderRadius: 999, overflow: 'hidden' },
        !isDisabled && getButtonOuterShadow(isLight),
      ]}
      onLayout={e => setHeight(e.nativeEvent.layout.height)}
    >
      <LinearGradient
        colors={isDisabled ? [DISABLED_COLOR, DISABLED_COLOR] : (colors ?? DEFAULT_GRADIENT_COLORS)}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      {!isDisabled && (
        <>
          <LinearGradient
            colors={params.topShadowColors}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 0.75 }}
            style={StyleSheet.absoluteFillObject}
            pointerEvents="none"
          />
          <RNView
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 999, overflow: 'hidden' }}
            pointerEvents="none"
          >
            <RNView
              style={
                {
                  position: 'absolute',
                  top: -height * 0.6,
                  left: '-10%',
                  width: '45%',
                  height: height * 2.2,
                  transform: [{ rotate: params.specularAngle }],
                  // Web-only CSS escape hatch (not part of RN's ViewStyle).
                  backgroundImage: `radial-gradient(ellipse at 40% 40%, ${params.specularPeak} 0%, rgba(255,255,255,0) 70%)`,
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                } as any
              }
            />
          </RNView>
        </>
      )}
      <RNView
        style={{
          minHeight: BUTTON_HEIGHT,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          paddingHorizontal: 20,
        }}
      >
        {loading && <ActivityIndicator size="small" color="#ffffff" />}
        <AppText variant="title" color="#ffffff">
          {label}
        </AppText>
      </RNView>
    </TouchableOpacity>
  )
}
