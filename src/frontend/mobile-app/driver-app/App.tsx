import React, { useEffect } from 'react'
import { View, ActivityIndicator } from 'react-native'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StatusBar } from 'expo-status-bar'
import LoginScreen        from './src/screens/LoginScreen'
import DashboardScreen    from './src/screens/DashboardScreen'
import DigitalHumanScreen from './src/screens/DigitalHumanScreen'
import { useAuthStore } from './src/store/authStore'
import type { RootStackParamList } from './src/types'

const Stack = createNativeStackNavigator<RootStackParamList>()
const queryClient = new QueryClient()

function RootNavigator() {
  const driver   = useAuthStore(s => s.driver)
  const hydrated = useAuthStore(s => s.hydrated)
  const hydrate  = useAuthStore(s => s.hydrate)

  useEffect(() => { hydrate() }, [])

  if (!hydrated) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1a1f36' }}>
        <ActivityIndicator color="#6c8aff" size="large" />
      </View>
    )
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      {driver ? (
        <>
          <Stack.Screen name="Dashboard"    component={DashboardScreen} />
          <Stack.Screen
            name="DigitalHuman"
            component={DigitalHumanScreen}
            options={{ animation: 'slide_from_bottom' }}
          />
        </>
      ) : (
        <Stack.Screen name="Login" component={LoginScreen} />
      )}
    </Stack.Navigator>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <NavigationContainer>
        <StatusBar style="light" />
        <RootNavigator />
      </NavigationContainer>
    </QueryClientProvider>
  )
}
