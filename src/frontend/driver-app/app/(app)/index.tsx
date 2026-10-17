/**
 * Full-bleed map home — no Screen shell (map exception).
 * Voice + chat open from the center Trợ lý AI orb (tab bar); no floating chat FAB.
 */
import { useCallback } from 'react'
import { View } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { setStatusBarStyle } from 'expo-status-bar'
import { DriverMap } from '../../src/features/home/components/DriverMap'
import { useThemeStore } from '../../src/stores/themeStore'

export default function HomeScreen() {
  const themeMode = useThemeStore(s => s.mode)
  // The Goong map tiles are light in both themes, so the status bar must be
  // dark-on-light here even in dark mode; restore the theme's style on blur.
  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle('dark')
      return () => setStatusBarStyle(themeMode === 'dark' ? 'light' : 'dark')
    }, [themeMode]),
  )
  return (
    <View style={{ flex: 1 }}>
      <DriverMap />
    </View>
  )
}
