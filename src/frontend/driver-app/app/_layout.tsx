// import '../web.css'
import { useEffect } from 'react'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { TamaguiProvider, Theme, View } from 'tamagui'
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter'
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

  // Screen order matters for Stack.Protected: when a guard flips false, Expo
  // Router falls back to the *first available* screen in this list. Putting
  // ungated `map-preview` first made logout land on the DEV map instead of
  // the auth Landing. Auth must be the first available route when logged out.
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!accessToken}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      <Stack.Protected guard={!!accessToken}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      <Stack.Screen name="map-preview" />
    </Stack>
  )
}

export default function RootLayout() {
  const hasHydrated = useAuthStore(s => s.hasHydrated)
  const themeMode = useThemeStore(s => s.mode)
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  })

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
              {hasHydrated && fontsLoaded ? (
                <AppShell />
              ) : (
                <View flex={1} backgroundColor="$surface" />
              )}
            </QueryProvider>
          </Theme>
        </TamaguiProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}
