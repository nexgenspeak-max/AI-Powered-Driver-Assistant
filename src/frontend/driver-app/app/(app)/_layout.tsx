import { StyleSheet, View } from 'react-native'
import { AssistantChatPanel } from '../../src/features/home/components/AssistantChatPanel'
import { useAssistantChatStore } from '../../src/features/home/stores/assistantChatStore'
import { Tabs } from 'expo-router'
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs'
import { LiquidGlassProvider, LiquidGlassTabBar } from '../../src/components/LiquidGlassTabBar'
import { DriverTabBarIcon, type DriverTabRoute } from '../../src/components/tabBarIcons'
import { TripOfferBanner } from '../../src/features/dashboard/components/TripOfferBanner'
import { useDispatchSocket } from '../../src/features/dashboard/hooks/useDispatchSocket'
import { usePushLocationOnNewTrip } from '../../src/features/dashboard/hooks/usePushLocationOnNewTrip'
import { useAutoConnectOnNudge } from '../../src/features/home/hooks/useAutoConnectOnNudge'
import { useCaptureVoiceMessages } from '../../src/features/home/hooks/useCaptureVoiceMessages'
import { preloadCzenFillers } from '../../src/features/home/lib/czenFillerAudio'
import { useReturnHomeOnVoiceEnd } from '../../src/features/home/hooks/useReturnHomeOnVoiceEnd'
import { useCurrentUser } from '../../src/features/auth/hooks/useCurrentUser'
import { useEffect } from 'react'

function TabIcon({ route, size, color, focused }: { route: DriverTabRoute; size: number; color: string; focused: boolean }) {
  return <DriverTabBarIcon route={route} size={size} color={color} focused={focused} />
}

const renderTabBar = (props: BottomTabBarProps) => <LiquidGlassTabBar {...props} />

function AssistantChatOverlay() {
  const panelOpen = useAssistantChatStore(s => s.panelOpen)
  const closePanel = useAssistantChatStore(s => s.closePanel)
  if (!panelOpen) return null
  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 50, elevation: 50 }]}>
      <AssistantChatPanel onClose={closePanel} />
    </View>
  )
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
  useReturnHomeOnVoiceEnd()
  useEffect(() => {
    preloadCzenFillers()
  }, [])

  return (
    <LiquidGlassProvider>
      <View style={{ flex: 1 }}>
        <Tabs
          tabBar={renderTabBar}
          detachInactiveScreens={false}
          screenOptions={{
            headerShown: false,
            // Inactive tabs stay frozen — avoids map/list re-rendering on every
            // poll tick from useDriverContext in sibling tabs.
            freezeOnBlur: true,
          }}
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
        <AssistantChatOverlay />
      </View>
    </LiquidGlassProvider>
  )
}
