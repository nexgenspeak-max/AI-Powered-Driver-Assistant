import type { PropsWithChildren } from 'react'
import { StyleSheet, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useThemeName } from 'tamagui'

/**
 * Clean brand backdrop shared by Landing / Login / Register: a quiet violet
 * wash fading into the screen background. No illustration — the Czen mark
 * is the only picture, and form fields stay on a calm, high-contrast field.
 */
export function AuthScreenBackground({ children }: PropsWithChildren) {
  const isLight = useThemeName() === 'light'
  const backdrop = isLight
    ? (['#EDE9FE', '#F5F4F8', '#F5F4F8'] as const)
    : (['#2A1B4D', '#1A1420', '#121212'] as const)

  return (
    <View style={styles.root}>
      <LinearGradient colors={[...backdrop]} locations={[0, 0.5, 1]} style={StyleSheet.absoluteFill} pointerEvents="none" />
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
})
