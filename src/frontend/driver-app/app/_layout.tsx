import '../global.css'
import { useEffect } from 'react'
import { Stack, router, useSegments } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { QueryProvider } from '../src/providers/QueryProvider'
import { TamaguiProvider } from '../src/providers/TamaguiProvider'
import { useAuthStore } from '../src/stores/authStore'

function AuthGuard() {
  const driver   = useAuthStore(s => s.driver)
  const segments = useSegments()

  useEffect(() => {
    const inLogin = segments[0] === 'login'
    if (!driver && !inLogin)  router.replace('/login')
    if (driver  &&  inLogin)  router.replace('/')
  }, [driver, segments])

  return null
}

export default function RootLayout() {
  return (
    <TamaguiProvider>
      <QueryProvider>
        <StatusBar style="light" />
        <AuthGuard />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: '#1a1f36' },
            headerTintColor: '#fff',
            headerTitleStyle: { fontWeight: '700' },
            contentStyle: { backgroundColor: '#f4f6fb' },
            headerShown: false,
          }}
        >
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="index" options={{ headerShown: false }} />
        </Stack>
      </QueryProvider>
    </TamaguiProvider>
  )
}
