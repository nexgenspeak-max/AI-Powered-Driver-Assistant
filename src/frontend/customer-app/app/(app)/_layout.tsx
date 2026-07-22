import { Image, type ImageSourcePropType } from 'react-native'
import { Tabs } from 'expo-router'
import { useTheme } from 'tamagui'
import { useThemeStore } from '../../src/stores/themeStore'
import { GlassMaterial } from '../../src/components/LiquidGlass'
import { GlassTabButton } from '../../src/components/GlassTabButton'

// Light mode: flat, full-color icon set (assets/icons/light/) — fixed
// palette raster images, not tintable, so active/inactive is opacity there.
// Dark mode: single-color silhouette set (assets/icons/dark/) — tintable,
// so active/inactive is a white-vs-purple tintColor instead (see TabIcon).
const ICONS = {
  home: require('../../assets/icons/light/house.png') as ImageSourcePropType,
  booking: require('../../assets/icons/light/car.png') as ImageSourcePropType,
  trips: require('../../assets/icons/light/route-map.png') as ImageSourcePropType,
  profile: require('../../assets/icons/light/profile.png') as ImageSourcePropType,
}
const DARK_ICONS = {
  home: require('../../assets/icons/dark/house.png') as ImageSourcePropType,
  booking: require('../../assets/icons/dark/car.png') as ImageSourcePropType,
  trips: require('../../assets/icons/dark/route-map.png') as ImageSourcePropType,
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
    <Tabs
      screenOptions={{
        headerShown: false,
        // Light mode: no filled pill behind the active tab anymore (see
        // GlassTabButton) — active vs. inactive is just darker-vs-lighter
        // black/gray text, no white-on-white or black-on-black risk. Dark
        // mode keeps the white-on-purple-pill look unchanged.
        tabBarActiveTintColor: isLight ? '#000000' : '#ffffff',
        tabBarInactiveTintColor: theme.textMuted.val,
        tabBarButton: props => <GlassTabButton {...props} />,
        // Frosted-glass floating bar — real native blur + gradient wash +
        // gradient hairline border, see LiquidGlass.tsx `GlassMaterial`.
        tabBarBackground: () => (
          <GlassMaterial borderRadius={30} tint={isLight ? 'light' : 'dark'} blurIntensity={55} style={{ flex: 1 }} />
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
          tabBarIcon: ({ size, focused }) => (
            <TabIcon source={ICONS.home} darkSource={DARK_ICONS.home} size={size} focused={focused} isDark={isDark} />
          ),
        }}
      />
      <Tabs.Screen
        name="booking"
        options={{
          title: 'Booking',
          tabBarIcon: ({ size, focused }) => (
            <TabIcon source={ICONS.booking} darkSource={DARK_ICONS.booking} size={size} focused={focused} isDark={isDark} />
          ),
        }}
      />
      <Tabs.Screen
        name="trips"
        options={{
          title: 'Trips',
          tabBarIcon: ({ size, focused }) => (
            <TabIcon source={ICONS.trips} darkSource={DARK_ICONS.trips} size={size} focused={focused} isDark={isDark} />
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
      <Tabs.Screen name="trip/[id]" options={{ href: null, title: 'Trip Status' }} />
    </Tabs>
  )
}
