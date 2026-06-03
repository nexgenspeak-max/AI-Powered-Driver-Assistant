import React from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import BookingScreen    from './src/screens/BookingScreen'
import TripStatusScreen from './src/screens/TripStatusScreen'
import SupportScreen    from './src/screens/SupportScreen'
import type { RootStackParamList } from './src/types'

const Stack = createNativeStackNavigator<RootStackParamList>()
const queryClient = new QueryClient()

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Booking"    component={BookingScreen} />
          <Stack.Screen name="TripStatus" component={TripStatusScreen} />
          <Stack.Screen name="Support"    component={SupportScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </QueryClientProvider>
  )
}
