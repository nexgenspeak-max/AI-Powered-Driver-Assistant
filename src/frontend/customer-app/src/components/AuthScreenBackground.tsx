import type { PropsWithChildren } from 'react'
import { ImageBackground, StyleSheet, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useThemeName } from 'tamagui'
import { layoutBackground } from '../theme/layoutAssets'

/**
 * Full-bleed landing atmosphere behind Login / Register.
 * Same composition both themes (layoutAssets); theme look = scrim only.
 */
export function AuthScreenBackground({ children }: PropsWithChildren) {
  const isLight = useThemeName() === 'light'
  const scrimColors = isLight
    ? (['rgba(245,244,248,0.55)', 'rgba(245,244,248,0.88)', 'rgba(245,244,248,0.96)'] as const)
    : (['rgba(18,18,18,0.35)', 'rgba(18,18,18,0.78)', 'rgba(18,18,18,0.94)'] as const)

  return (
    <View style={styles.root}>
      <ImageBackground
        source={layoutBackground('landing', isLight ? 'light' : 'dark')}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
        accessibilityIgnoresInvertColors
      />
      <LinearGradient
        colors={[...scrimColors]}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
})
