import '../web.css'
import { useEffect } from 'react'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { TamaguiProvider, Theme } from 'tamagui'
import tamaguiConfig from '../tamagui.config'
import { QueryProvider } from '../src/providers/QueryProvider'
import { useAuthStore } from '../src/stores/authStore'
import { useThemeStore } from '../src/stores/themeStore'
import { useWakeWordSettingsStore } from '../src/features/assistant-wakeword/wakeWordSettingsStore'
import { enableWakeWord, disableWakeWord } from '../src/features/assistant-wakeword/wakeWordService'

export default function RootLayout() {
  const customer = useAuthStore(s => s.customer)
  const wakeWordEnabled = useWakeWordSettingsStore(s => s.enabled)
  const themeMode = useThemeStore(s => s.mode)

  useEffect(() => {
    if (customer && wakeWordEnabled) {
      enableWakeWord()
    } else {
      disableWakeWord()
    }
  }, [customer, wakeWordEnabled])

  return (
    <TamaguiProvider config={tamaguiConfig} defaultTheme={themeMode}>
      <Theme name={themeMode}>
        <QueryProvider>
          <StatusBar style={themeMode === 'dark' ? 'light' : 'dark'} />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Protected guard={!!customer}>
              <Stack.Screen name="(app)" />
            </Stack.Protected>
            <Stack.Protected guard={!customer}>
              <Stack.Screen name="(auth)" />
            </Stack.Protected>
          </Stack>
        </QueryProvider>
      </Theme>
    </TamaguiProvider>
  )
}
