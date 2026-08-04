import '../web.css'
import { useEffect, useRef } from 'react'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { TamaguiProvider, Theme, View } from 'tamagui'
import tamaguiConfig from '../tamagui.config'
import { QueryProvider } from '../src/providers/QueryProvider'
import { useAuthStore } from '../src/stores/authStore'
import { useThemeStore } from '../src/stores/themeStore'
import { useWakeWordSettingsStore, WAKE_WORD_FEATURE_ENABLED } from '../src/features/assistant-wakeword/wakeWordSettingsStore'
import { enableWakeWord, disableWakeWord } from '../src/features/assistant-wakeword/wakeWordService'
import { useCurrentUser } from '../src/features/auth/hooks/useCurrentUser'
import { authService } from '../src/services/api/auth'
import { useCustomerDispatchSocket } from '../src/features/trips/hooks/useCustomerDispatchSocket'
import { TripNotificationBanner } from '../src/features/trips/components/TripNotificationBanner'

function AppShell() {
  const accessToken = useAuthStore(s => s.accessToken)
  const wakeWordEnabled = useWakeWordSettingsStore(s => s.enabled)
  const { data: customer } = useCurrentUser()

  useEffect(() => {
    if (WAKE_WORD_FEATURE_ENABLED && accessToken && wakeWordEnabled) {
      enableWakeWord()
    } else {
      disableWakeWord()
    }
  }, [accessToken, wakeWordEnabled])

  // Login/register no longer hand back a customer id directly (see
  // authService.ts) — marking the account online now reacts to the profile
  // becoming available instead, guarded so it only fires once per id rather
  // than on every useCurrentUser() refetch.
  const markedOnlineFor = useRef<string | null>(null)
  useEffect(() => {
    if (!customer || markedOnlineFor.current === customer.id) return
    markedOnlineFor.current = customer.id
    authService.setStatus(customer.id, 'online').catch(() => {})
  }, [customer])

  // Lives here (not the trip status screen) so the "driver answered" banner
  // can show up regardless of which screen the customer is currently on.
  useCustomerDispatchSocket(customer?.id)

  return (
    <View flex={1}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={!!accessToken}>
          <Stack.Screen name="(app)" />
        </Stack.Protected>
        <Stack.Protected guard={!accessToken}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
      </Stack>
      <TripNotificationBanner />
    </View>
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
                  already-logged-in customer while that read is still in flight. */}
              {hasHydrated ? <AppShell /> : <View flex={1} backgroundColor="$surface" />}
            </QueryProvider>
          </Theme>
        </TamaguiProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}
