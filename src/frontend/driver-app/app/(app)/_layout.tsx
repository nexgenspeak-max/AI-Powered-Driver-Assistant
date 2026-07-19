import { Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from 'tamagui'
import { useThemeStore } from '../../src/stores/themeStore'
import { GlassMaterial } from '../../src/components/LiquidGlass'
import { GlassTabButton } from '../../src/components/GlassTabButton'

export default function AppLayout() {
  const theme = useTheme()
  const themeMode = useThemeStore(s => s.mode)

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        // White icon/label when active — they now sit on the purple glass
        // blob (GlassTabButton) instead of the plain dark bar.
        tabBarActiveTintColor: '#ffffff',
        tabBarInactiveTintColor: theme.textMuted.val,
        tabBarButton: props => <GlassTabButton {...props} />,
        // Frosted-glass floating bar — real native blur + gradient wash +
        // gradient hairline border, see LiquidGlass.tsx `GlassMaterial`.
        tabBarBackground: () => (
          <GlassMaterial borderRadius={30} tint={themeMode === 'dark' ? 'dark' : 'light'} blurIntensity={55} style={{ flex: 1 }} />
        ),
        tabBarStyle: {
          position: 'absolute',
          left: 20,
          right: 20,
          bottom: 16,
          height: 76,
          borderRadius: 30,
          borderTopWidth: 0,
          backgroundColor: 'transparent',
          elevation: 0,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.35,
          shadowRadius: 16,
          // React Navigation adds its own safe-area bottom padding by default
          // (to clear the home indicator) — redundant since the whole bar is
          // already floated up via `bottom: 16`, and it was pushing the icon
          // row toward the top of the bar instead of centering it.
          paddingTop: 0,
          paddingBottom: 0,
        },
        tabBarItemStyle: { justifyContent: 'center', alignItems: 'center' },
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
        name="dashboard"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => <Ionicons name="car" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="earnings"
        options={{
          title: 'Earnings',
          tabBarIcon: ({ color, size }) => <Ionicons name="wallet" color={color} size={size} />,
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
    </Tabs>
  )
}
