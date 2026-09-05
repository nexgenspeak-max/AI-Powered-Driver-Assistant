import { Platform, View as RNView, StyleSheet, type ViewStyle } from 'react-native'
import { styled, View, useTheme, useThemeName, type GetProps } from 'tamagui'
import { GlassSheen, getGlassShadow } from './LiquidGlass'
import { authGlassTheme } from '../theme'

const CardFrame = styled(View, {
  // Fill lives on the outer shadow host so iOS can cast a *rounded* shadow.
  // Frame stays transparent + clips children/sheen to the corner radius.
  backgroundColor: 'transparent',
  borderRadius: '$card',
  padding: '$4',
  overflow: 'hidden',
})

type CardProps = GetProps<typeof CardFrame> & {
  /** 'strong' floats the card further off its background — for cards sitting
   *  directly on a near-black/near-white screen bg (e.g. the auth screens)
   *  instead of the usual mid-tone `$surface`, where the default shadow
   *  reads as too faint to separate the two. */
  shadowIntensity?: 'normal' | 'strong'
}

function getStrongGlassShadow(isLight: boolean) {
  const s = authGlassTheme.card.shadow
  return {
    shadowColor: s.color,
    shadowOffset: { width: 0, height: isLight ? s.offsetY.light : s.offsetY.dark },
    shadowOpacity: isLight ? s.opacity.light : s.opacity.dark,
    shadowRadius: isLight ? s.radius.light : s.radius.dark,
    // Android elevation paints a hard rectangular plate — we use a rounded
    // underlay instead (see SoftShadowPlate). Keep elevation at 0 there.
    elevation: 0,
  } as const
}

function outerSizing(
  width: CardProps['width'],
  maxWidth: CardProps['maxWidth'],
  alignSelf: CardProps['alignSelf'],
): ViewStyle {
  const style: ViewStyle = {}
  if (width === '100%') style.width = '100%'
  else if (typeof width === 'number') style.width = width
  if (typeof maxWidth === 'number') style.maxWidth = maxWidth
  if (typeof alignSelf === 'string') style.alignSelf = alignSelf as ViewStyle['alignSelf']
  return style
}

function resolveFill(
  backgroundColor: CardProps['backgroundColor'],
  fallback: string,
): string {
  if (typeof backgroundColor === 'string' && backgroundColor.length > 0) {
    // Tamagui token strings like "$surfaceElevated" are not valid RN colors —
    // callers that pass tokens leave fill to the theme fallback.
    if (backgroundColor.startsWith('$')) return fallback
    return backgroundColor
  }
  return fallback
}

/** Soft rounded plate behind the card — reliable on Android where elevation is square. */
function SoftShadowPlate({
  radius,
  isLight,
  strong,
}: {
  radius: number
  isLight: boolean
  strong: boolean
}) {
  return (
    <RNView
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFillObject,
        {
          top: strong ? (isLight ? 8 : 12) : isLight ? 6 : 8,
          borderRadius: radius,
          backgroundColor: '#000000',
          opacity: strong ? (isLight ? 0.12 : 0.35) : isLight ? 0.08 : 0.22,
          transform: [{ scaleX: 0.98 }, { scaleY: 0.99 }],
        },
      ]}
    />
  )
}

/**
 * Card with a soft *rounded* drop — not RN elevation (square on Android) and
 * not shadow-on-overflow-hidden (clips to a hard box).
 *
 * Structure: sizing wrap → SoftShadowPlate → opaque rounded host (iOS shadow)
 * → clipped frame (sheen + children).
 */
export function Card({
  children,
  shadowIntensity = 'normal',
  borderRadius,
  width,
  maxWidth,
  alignSelf,
  backgroundColor,
  ...props
}: CardProps) {
  const isLight = useThemeName() === 'light'
  const theme = useTheme()
  const strong = shadowIntensity === 'strong'
  const iosShadow = strong ? getStrongGlassShadow(isLight) : { ...getGlassShadow(isLight), elevation: 0 }
  const radius = typeof borderRadius === 'number' ? borderRadius : 24
  const fill = resolveFill(backgroundColor, theme.surfaceElevated.val)

  return (
    <RNView style={[outerSizing(width, maxWidth, alignSelf), { borderRadius: radius }]}>
      <SoftShadowPlate radius={radius} isLight={isLight} strong={strong} />
      <RNView
        style={[
          {
            borderRadius: radius,
            backgroundColor: fill,
            overflow: 'hidden',
            // iOS: native soft shadow follows the opaque rounded rect.
            // Android: skip elevation (square); SoftShadowPlate carries the look.
            ...(Platform.OS === 'ios' ? iosShadow : null),
          },
        ]}
      >
        <CardFrame borderRadius={borderRadius} width="100%" {...props}>
          <GlassSheen borderRadius={radius} withBorder={false} />
          {children}
        </CardFrame>
      </RNView>
    </RNView>
  )
}
