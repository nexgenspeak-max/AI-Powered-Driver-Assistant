import { Image, View, type ImageSourcePropType } from 'react-native'
import { Tabs } from 'expo-router'
import { useTheme } from 'tamagui'
import { useThemeStore } from '../../src/stores/themeStore'
import { LiquidGlassProvider, PageBlurOverlay, LiquidGlassTabBar } from '../../src/components/LiquidGlassTabBar'
import { GlobalAssistantOrb } from '../../src/features/home/components/GlobalAssistantOrb'

// Light mode: flat, full-color icon set (assets/icons/light/) — fixed
// palette raster images, not tintable, so active/inactive is opacity there.
// Dark mode: single-color silhouette set (assets/icons/dark/) — tintable,
// so active/inactive is a white-vs-purple tintColor instead (see TabIcon).
const ICONS = {
  home: require('../../assets/icons/light/house.png') as ImageSourcePropType,
  dashboard: require('../../assets/icons/light/steering-wheel.png') as ImageSourcePropType,
  earnings: require('../../assets/icons/light/earnings.png') as ImageSourcePropType,
  profile: require('../../assets/icons/light/profile.png') as ImageSourcePropType,
}
const DARK_ICONS = {
  home: require('../../assets/icons/dark/house.png') as ImageSourcePropType,
  dashboard: require('../../assets/icons/dark/steering-wheel.png') as ImageSourcePropType,
  earnings: require('../../assets/icons/dark/earnings.png') as ImageSourcePropType,
  profile: require('../../assets/icons/dark/profile.png') as ImageSourcePropType,
}
const ACTIVE_PURPLE = '#8B5CF6'
// Dark-mode silhouette set reads visually "bigger" than the light set's flat
// illustrations at the same box size, so it's rendered a bit smaller.
const DARK_ICON_SCALE = 0.82

function TabIcon({
  source,
  darkSource,
  size,
  focused,
  isDark,
}: {
  source: ImageSourcePropType
  darkSource: ImageSourcePropType
  size: number
  focused: boolean
  isDark: boolean
}) {
  if (isDark) {
    const darkSize = size * DARK_ICON_SCALE
    return (
      <Image
        source={darkSource}
        style={{ width: darkSize, height: darkSize, tintColor: focused ? ACTIVE_PURPLE : '#ffffff' }}
        resizeMode="contain"
      />
    )
  }
  return <Image source={source} style={{ width: size, height: size, opacity: focused ? 1 : 0.45 }} resizeMode="contain" />
}

export default function AppLayout() {
  const theme = useTheme()
  const themeMode = useThemeStore(s => s.mode)
  const isLight = themeMode !== 'dark'
  const isDark = !isLight

  return (
    // Shares the `pageBlur` shared value between the tab bar (writer, on
    // long-press) and PageBlurOverlay (reader, wrapping each screen below).
    <LiquidGlassProvider>
      <View style={{ flex: 1 }}>
        <Tabs
          // Wraps each screen's own content only — not the tab bar itself, so
          // long-pressing a tab blurs the page behind it while the tab bar +
          // its glass pill stay sharp.
          screenLayout={({ children }) => <PageBlurOverlay>{children}</PageBlurOverlay>}
          tabBar={props => <LiquidGlassTabBar {...props} />}
          screenOptions={{
            headerShown: false,
            // Brand purple for the selected tab in both themes — matches the
            // rest of the app's CTA/accent color instead of the old
            // black/white split (that was tuned for GlassTabButton's own
            // dark-mode purple pill background, which LiquidGlassTabBar
            // doesn't have; the active tab needs its own color cue now).
            tabBarActiveTintColor: ACTIVE_PURPLE,
            tabBarInactiveTintColor: theme.textMuted.val,
          }}
        >
          <Tabs.Screen
            name="index"
            options={{
              title: 'Home',
              tabBarIcon: ({ size, focused }) => (
                <TabIcon source={ICONS.home} darkSource={DARK_ICONS.home} size={size} focused={focused} isDark={isDark} />
              ),
            }}
          />
          <Tabs.Screen
            name="dashboard"
            options={{
              title: 'Dashboard',
              tabBarIcon: ({ size, focused }) => (
                <TabIcon source={ICONS.dashboard} darkSource={DARK_ICONS.dashboard} size={size} focused={focused} isDark={isDark} />
              ),
            }}
          />
          <Tabs.Screen
            name="earnings"
            options={{
              title: 'Earnings',
              tabBarIcon: ({ size, focused }) => (
                <TabIcon source={ICONS.earnings} darkSource={DARK_ICONS.earnings} size={size} focused={focused} isDark={isDark} />
              ),
            }}
          />
          <Tabs.Screen
            name="profile"
            options={{
              title: 'Profile',
              tabBarIcon: ({ size, focused }) => (
                <TabIcon source={ICONS.profile} darkSource={DARK_ICONS.profile} size={size} focused={focused} isDark={isDark} />
              ),
            }}
          />
          <Tabs.Screen name="about" options={{ href: null, title: 'About' }} />
          <Tabs.Screen name="faq" options={{ href: null, title: 'FAQ' }} />
          <Tabs.Screen name="edit-profile" options={{ href: null, title: 'Edit Profile' }} />
          <Tabs.Screen name="add-delivery" options={{ href: null, title: 'Add Delivery' }} />
          <Tabs.Screen name="vehicle" options={{ href: null, title: 'Vehicle' }} />
          <Tabs.Screen name="bank-info" options={{ href: null, title: 'Bank Info' }} />
          <Tabs.Screen name="documents" options={{ href: null, title: 'Documents' }} />
          <Tabs.Screen name="safety" options={{ href: null, title: 'Safety' }} />
          <Tabs.Screen name="support" options={{ href: null, title: 'Support' }} />
          <Tabs.Screen name="terms" options={{ href: null, title: 'Terms' }} />
        </Tabs>
        <GlobalAssistantOrb />
      </View>
    </LiquidGlassProvider>
  )
}
