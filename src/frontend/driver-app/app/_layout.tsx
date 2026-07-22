// import '../web.css'
import { useEffect } from 'react'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { TamaguiProvider, Theme, View } from 'tamagui'
import tamaguiConfig from '../tamagui.config'
import { QueryProvider } from '../src/providers/QueryProvider'
import { useAuthStore } from '../src/stores/authStore'
import { useThemeStore } from '../src/stores/themeStore'
import { useWakeWordSettingsStore } from '../src/features/assistant-wakeword/wakeWordSettingsStore'
import { enableWakeWord, disableWakeWord } from '../src/features/assistant-wakeword/wakeWordService'

function AppShell() {
  const accessToken = useAuthStore(s => s.accessToken)
  const wakeWordEnabled = useWakeWordSettingsStore(s => s.enabled)

  useEffect(() => {
    if (accessToken && wakeWordEnabled) {
      enableWakeWord()
    } else {
      disableWakeWord()
    }
  }, [accessToken, wakeWordEnabled])

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!!accessToken}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      <Stack.Protected guard={!accessToken}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
    </Stack>
  )
}

export default function RootLayout() {
  const hasHydrated = useAuthStore(s => s.hasHydrated)
  const themeMode = useThemeStore(s => s.mode)

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <TamaguiProvider config={tamaguiConfig} defaultTheme={themeMode}>
          <Theme name={themeMode}>
            <QueryProvider>
              <StatusBar style={themeMode === 'dark' ? 'light' : 'dark'} />
              {/* Tokens live in SecureStore now (see authStore.ts), which — unlike
                  the old MMKV-backed store — reads async, so routing waits here
                  rather than risking a flash of the login screen for an
                  already-logged-in driver while that read is still in flight. */}
              {hasHydrated ? <AppShell /> : <View flex={1} backgroundColor="$surface" />}
            </QueryProvider>
          </Theme>
        </TamaguiProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}
