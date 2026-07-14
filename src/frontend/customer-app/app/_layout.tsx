import '../global.css'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { QueryProvider } from '../src/providers/QueryProvider'
import { useAuthStore } from '../src/stores/authStore'

export default function RootLayout() {
  const customer = useAuthStore(s => s.customer)

  return (
    <QueryProvider>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={!!customer}>
          <Stack.Screen name="(app)" />
        </Stack.Protected>
        <Stack.Protected guard={!customer}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
      </Stack>
    </QueryProvider>
  )
}
