import { View as RNView } from 'react-native'
import { Text } from 'tamagui'

// Web fallback — no Skia on Expo web, so the shaded-sphere shader (real
// per-pixel normal + diffuse + rim + specular) is approximated with three
// stacked CSS gradients: a radial highlight near the upper-left (the glossy
// glint), a radial vignette toward the bottom (the rim shadow), and the same
// three-stop vertical base gradient underneath.
export interface GlossyAvatarProps {
  letter: string
  size?: number
}

export function GlossyAvatar({ letter, size = 96 }: GlossyAvatarProps) {
  return (
    // Plain RN View, not Tamagui's — see GlossyAvatar.tsx's header comment:
    // Tamagui's `View` doesn't reliably get `position: relative` on web, so
    // an absolutely-positioned child here would anchor to a distant
    // ancestor instead of this box.
    <RNView style={{ width: size, height: size, position: 'relative', alignItems: 'center', justifyContent: 'center' }}>
      <RNView
        style={
          {
            position: 'absolute',
            top: 0,
            left: 0,
            width: size,
            height: size,
            borderRadius: size / 2,
            // Web-only CSS escape hatch (not part of RN's ViewStyle) — a
            // layered radial-highlight + radial-vignette + linear-base
            // gradient stack, comma-separated so all three paint together.
            backgroundImage:
              'radial-gradient(circle at 32% 28%, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0) 32%), ' +
              'radial-gradient(circle at 50% 92%, rgba(0,0,0,0.32) 0%, rgba(0,0,0,0) 55%), ' +
              'linear-gradient(180deg, #ffffff 0%, #e879f9 50%, #7C5B9C 100%)',
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as any
        }
      />
      <Text color="#ffffff" fontSize={size * 0.375} fontWeight="700">
        {letter}
      </Text>
    </RNView>
  )
}
