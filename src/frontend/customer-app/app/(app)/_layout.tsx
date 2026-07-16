import { Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from 'tamagui'

export default function AppLayout() {
  const theme = useTheme()

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.primary.val,
        tabBarInactiveTintColor: theme.textMuted.val,
        tabBarStyle: {
          position: 'absolute',
          left: 16,
          right: 16,
          bottom: 16,
          height: 64,
          borderRadius: 28,
          borderTopWidth: 0,
          borderWidth: 1,
          borderColor: theme.border.val,
          backgroundColor: theme.surfaceElevated.val,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.35,
          shadowRadius: 16,
          elevation: 8,
        },
        tabBarItemStyle: { paddingTop: 6 },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Ionicons name="home" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="booking"
        options={{
          title: 'Booking',
          tabBarIcon: ({ color, size }) => <Ionicons name="car" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="trips"
        options={{
          title: 'Trips',
          tabBarIcon: ({ color, size }) => <Ionicons name="time" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <Ionicons name="person" color={color} size={size} />,
        }}
      />
      <Tabs.Screen name="about" options={{ href: null, title: 'About' }} />
      <Tabs.Screen name="faq" options={{ href: null, title: 'FAQ' }} />
      <Tabs.Screen name="trip/[id]" options={{ href: null, title: 'Trip Status' }} />
    </Tabs>
  )
}
