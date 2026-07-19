// import '../web.css'
import { useEffect } from 'react'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { TamaguiProvider, Theme } from 'tamagui'
import tamaguiConfig from '../tamagui.config'
import { QueryProvider } from '../src/providers/QueryProvider'
import { useAuthStore } from '../src/stores/authStore'
import { useThemeStore } from '../src/stores/themeStore'
import { useWakeWordSettingsStore } from '../src/features/assistant-wakeword/wakeWordSettingsStore'
import { enableWakeWord, disableWakeWord } from '../src/features/assistant-wakeword/wakeWordService'

export default function RootLayout() {
  const driver = useAuthStore(s => s.driver)
  const wakeWordEnabled = useWakeWordSettingsStore(s => s.enabled)
  const themeMode = useThemeStore(s => s.mode)

  useEffect(() => {
    if (driver && wakeWordEnabled) {
      enableWakeWord()
    } else {
      disableWakeWord()
    }
  }, [driver, wakeWordEnabled])

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <TamaguiProvider config={tamaguiConfig} defaultTheme={themeMode}>
          <Theme name={themeMode}>
            <QueryProvider>
              <StatusBar style={themeMode === 'dark' ? 'light' : 'dark'} />
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Protected guard={!!driver}>
                  <Stack.Screen name="(app)" />
                </Stack.Protected>
                <Stack.Protected guard={!driver}>
                  <Stack.Screen name="(auth)" />
                </Stack.Protected>
              </Stack>
            </QueryProvider>
          </Theme>
        </TamaguiProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}
