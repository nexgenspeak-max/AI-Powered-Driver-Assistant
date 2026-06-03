import '../global.css'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { QueryProvider } from '../src/providers/QueryProvider'
import { TamaguiProvider } from '../src/providers/TamaguiProvider'

export default function RootLayout() {
  return (
    <TamaguiProvider>
      <QueryProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: '#1a1f36' },
            headerTintColor: '#fff',
            headerTitleStyle: { fontWeight: '700' },
            contentStyle: { backgroundColor: '#f4f6fb' },
          }}
        >
          <Stack.Screen name="index" options={{ title: 'Book a Ride' }} />
          <Stack.Screen name="trip/[id]" options={{ title: 'Trip Status' }} />
        </Stack>
      </QueryProvider>
    </TamaguiProvider>
  )
}
