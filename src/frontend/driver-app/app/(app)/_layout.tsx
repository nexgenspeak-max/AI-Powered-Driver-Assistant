import { View } from 'react-native'
import { Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { LiquidGlassProvider, LiquidGlassTabBar } from '../../src/components/LiquidGlassTabBar'
import { TripOfferBanner } from '../../src/features/dashboard/components/TripOfferBanner'
import { useDispatchSocket } from '../../src/features/dashboard/hooks/useDispatchSocket'
import { usePushLocationOnNewTrip } from '../../src/features/dashboard/hooks/usePushLocationOnNewTrip'
import { useAutoConnectOnNudge } from '../../src/features/home/hooks/useAutoConnectOnNudge'
import { useCaptureVoiceMessages } from '../../src/features/home/hooks/useCaptureVoiceMessages'
import { useCurrentUser } from '../../src/features/auth/hooks/useCurrentUser'

// One vector icon set (Ionicons) for both themes — replaces the two raster
// PNG sets (flat colour for light, white silhouettes for dark). `color` and
// `size` come straight from LiquidGlassTabBar (focused → `$primary`).
type TabRoute = 'index' | 'dashboard' | 'earnings' | 'profile'
const TAB_ICON: Record<TabRoute, { on: keyof typeof Ionicons.glyphMap; off: keyof typeof Ionicons.glyphMap }> = {
  index: { on: 'home', off: 'home-outline' },
  dashboard: { on: 'car-sport', off: 'car-sport-outline' },
  earnings: { on: 'wallet', off: 'wallet-outline' },
  profile: { on: 'person', off: 'person-outline' },
}

function TabIcon({ route, size, color, focused }: { route: TabRoute; size: number; color: string; focused: boolean }) {
  const g = TAB_ICON[route]
  return <Ionicons name={focused ? g.on : g.off} size={size} color={color} />
}

export default function AppLayout() {
  // Lives here (not dashboard.tsx) so the socket connects — and the
  // trip-offer banner below can appear — regardless of which tab the driver
  // currently has open, not just while Dashboard is mounted.
  const { data: driver } = useCurrentUser()
  useDispatchSocket(driver?.status === 'online', driver?.phone)
  // Lives here too (not dashboard.tsx) so a pending nudge gets delivered
  // regardless of which tab the driver has open — same reasoning as the
  // dispatch socket above.
  useAutoConnectOnNudge()
  // Catches trip confirmations that happen outside TripCard/TripOfferBanner's
  // own tap handler (voice-agent's confirm_trip tool) — see the hook.
  usePushLocationOnNewTrip()
  // Always-on, independent of whether the chat overlay is currently open —
  // see useCaptureVoiceMessages.ts for why this can't live inside
  // AssistantChatPanel anymore.
  useCaptureVoiceMessages()

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
            name="dashboard"
            options={{
              title: 'Chuyến',
              tabBarIcon: ({ size, focused, color }) => (
                <TabIcon route="dashboard" size={size} focused={focused} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="earnings"
            options={{
              title: 'Thu nhập',
              tabBarIcon: ({ size, focused, color }) => (
                <TabIcon route="earnings" size={size} focused={focused} color={color} />
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
          <Tabs.Screen name="edit-profile" options={{ href: null, title: 'Edit Profile' }} />
          <Tabs.Screen name="assistant-settings" options={{ href: null, title: 'Assistant Settings' }} />
          <Tabs.Screen name="add-delivery" options={{ href: null, title: 'Add Delivery' }} />
          <Tabs.Screen name="vehicle" options={{ href: null, title: 'Vehicle' }} />
          <Tabs.Screen name="bank-info" options={{ href: null, title: 'Bank Info' }} />
          <Tabs.Screen name="documents" options={{ href: null, title: 'Documents' }} />
          <Tabs.Screen name="safety" options={{ href: null, title: 'Safety' }} />
          <Tabs.Screen name="support" options={{ href: null, title: 'Support' }} />
          <Tabs.Screen name="terms" options={{ href: null, title: 'Terms' }} />
        </Tabs>
        <TripOfferBanner />
      </View>
    </LiquidGlassProvider>
  )
}
