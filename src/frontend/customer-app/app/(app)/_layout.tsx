import { View } from 'react-native'
import { Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { LiquidGlassProvider, LiquidGlassTabBar } from '../../src/components/LiquidGlassTabBar'

// One vector icon set (Ionicons) for both themes — replaces the two raster
// PNG sets. `color` / `size` come from LiquidGlassTabBar (focused → `$primary`).
type TabRoute = 'index' | 'booking' | 'trips' | 'profile'
const TAB_ICON: Record<TabRoute, { on: keyof typeof Ionicons.glyphMap; off: keyof typeof Ionicons.glyphMap }> = {
  index: { on: 'home', off: 'home-outline' },
  booking: { on: 'car-sport', off: 'car-sport-outline' },
  trips: { on: 'time', off: 'time-outline' },
  profile: { on: 'person', off: 'person-outline' },
}

function TabIcon({ route, size, color, focused }: { route: TabRoute; size: number; color: string; focused: boolean }) {
  const g = TAB_ICON[route]
  return <Ionicons name={focused ? g.on : g.off} size={size} color={color} />
}

export default function AppLayout() {
  return (
    <LiquidGlassProvider>
      <View style={{ flex: 1 }}>
        <Tabs
          tabBar={props => <LiquidGlassTabBar {...props} />}
          screenOptions={{ headerShown: false }}
        >
          <Tabs.Screen
            name="index"
            options={{
              title: 'Trang chủ',
              tabBarIcon: ({ size, focused, color }) => (
                <TabIcon route="index" size={size} focused={focused} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="booking"
            options={{
              title: 'Đặt xe',
              tabBarIcon: ({ size, focused, color }) => (
                <TabIcon route="booking" size={size} focused={focused} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="trips"
            options={{
              title: 'Chuyến',
              tabBarIcon: ({ size, focused, color }) => (
                <TabIcon route="trips" size={size} focused={focused} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="profile"
            options={{
              title: 'Cá nhân',
              tabBarIcon: ({ size, focused, color }) => (
                <TabIcon route="profile" size={size} focused={focused} color={color} />
              ),
            }}
          />
          <Tabs.Screen name="about" options={{ href: null, title: 'About' }} />
          <Tabs.Screen name="faq" options={{ href: null, title: 'FAQ' }} />
          <Tabs.Screen name="trip/[id]" options={{ href: null, title: 'Trip Status' }} />
          <Tabs.Screen name="edit-profile" options={{ href: null, title: 'Edit Profile' }} />
          <Tabs.Screen name="payment-methods" options={{ href: null, title: 'Payment Methods' }} />
          <Tabs.Screen name="addresses" options={{ href: null, title: 'Addresses' }} />
          <Tabs.Screen name="promotions" options={{ href: null, title: 'Promotions' }} />
          <Tabs.Screen name="referral" options={{ href: null, title: 'Referral' }} />
          <Tabs.Screen name="safety" options={{ href: null, title: 'Safety' }} />
          <Tabs.Screen name="support" options={{ href: null, title: 'Support' }} />
          <Tabs.Screen name="terms" options={{ href: null, title: 'Terms' }} />
        </Tabs>
      </View>
    </LiquidGlassProvider>
  )
}
