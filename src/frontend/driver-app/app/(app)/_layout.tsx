import { StyleSheet, View } from 'react-native'
import { Tabs } from 'expo-router'
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs'
import { NavigationBar } from '../../src/components/NavigationBar'
import { DriverTabBarIcon, type DriverTabRoute } from '../../src/components/tabBarIcons'
import { TripOfferSheet } from '../../src/features/dashboard/components/TripOfferSheet'
import { useDispatchSocket } from '../../src/features/dashboard/hooks/useDispatchSocket'
import { usePushLocationOnNewTrip } from '../../src/features/dashboard/hooks/usePushLocationOnNewTrip'
import { useAutoConnectOnNudge } from '../../src/features/home/hooks/useAutoConnectOnNudge'
import { useCaptureVoiceMessages } from '../../src/features/home/hooks/useCaptureVoiceMessages'
import { preloadCzenFillers } from '../../src/features/home/lib/czenFillerAudio'
import { useReturnHomeOnVoiceEnd } from '../../src/features/home/hooks/useReturnHomeOnVoiceEnd'
import { useCurrentUser } from '../../src/features/auth/hooks/useCurrentUser'
import { AssistantChatPanel } from '../../src/features/home/components/AssistantChatPanel'
import { useAssistantChatStore } from '../../src/features/home/stores/assistantChatStore'
import { useEffect } from 'react'

function TabIcon({ route, size, color, focused }: { route: DriverTabRoute; size: number; color: string; focused: boolean }) {
  return <DriverTabBarIcon route={route} size={size} color={color} focused={focused} />
}

function AssistantChatOverlay() {
  const panelOpen = useAssistantChatStore((s) => s.panelOpen)
  const closePanel = useAssistantChatStore((s) => s.closePanel)
  if (!panelOpen) return null
  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 100, elevation: 100 }]}>
      <AssistantChatPanel onClose={closePanel} />
    </View>
  )
}

export default function AppLayout() {
  // Lives here (not dashboard.tsx) so the socket connects — and the
  // trip-offer banner below can appear — regardless of which tab the driver
  // currently has open, not just while Dashboard is mounted.
  const { data: driver } = useCurrentUser()
  const panelOpen = useAssistantChatStore((s) => s.panelOpen)
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
    <View style={{ flex: 1 }}>
      <Tabs
        // React Navigation invokes `tabBar` as a render function (not
        // createElement) — do not put hooks inside that callback/component.
        // Hide the full bar while chat is open; the composer's own voice
        // button (ComposerVoiceButton) takes over connect / end.
        tabBar={(props: BottomTabBarProps) =>
          panelOpen ? null : <NavigationBar {...props} />
        }
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
        <Tabs.Screen name="add-trip" options={{ href: null, title: 'Add Trip' }} />
        <Tabs.Screen name="vehicle" options={{ href: null, title: 'Vehicle' }} />
        <Tabs.Screen name="bank-info" options={{ href: null, title: 'Bank Info' }} />
        <Tabs.Screen name="documents" options={{ href: null, title: 'Documents' }} />
        <Tabs.Screen name="safety" options={{ href: null, title: 'Safety' }} />
        <Tabs.Screen name="support" options={{ href: null, title: 'Support' }} />
        <Tabs.Screen name="terms" options={{ href: null, title: 'Terms' }} />
      </Tabs>
      <AssistantChatOverlay />
      {/* Last and highest: a new offer auto-opens the voice panel (the
          agent reads it aloud), and the panel must never hide the sheet the
          driver taps to accept. */}
      <TripOfferSheet />
    </View>
  )
}
