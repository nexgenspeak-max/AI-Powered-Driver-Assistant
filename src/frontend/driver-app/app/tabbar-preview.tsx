import { useMemo, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { Redirect, useLocalSearchParams } from 'expo-router'
import { useTheme } from 'tamagui'
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs'
import { NavigationBar } from '../src/components/NavigationBar'
import { DriverTabBarIcon, type DriverTabRoute } from '../src/components/tabBarIcons'

const TABS: { name: DriverTabRoute; title: string }[] = [
  { name: 'index', title: 'Trang chủ' },
  { name: 'dashboard', title: 'Chuyến' },
  { name: 'earnings', title: 'Thu nhập' },
  { name: 'profile', title: 'Cá nhân' },
]

/** DEV-only: the real NavigationBar with mock navigation state, so the tab
 *  bar can be reviewed on a simulator/web without logging in (a login would
 *  revoke the driver's session on their own phone — one refresh token per
 *  account). Query: `?tab=0..3`. */
export default function TabBarPreviewScreen() {
  const theme = useTheme()
  const params = useLocalSearchParams<{ tab?: string }>()
  const [index, setIndex] = useState(() => Math.min(3, Math.max(0, Number(params.tab) || 0)))

  const props = useMemo(() => {
    const routes = TABS.map(t => ({ key: `${t.name}-key`, name: t.name, params: undefined }))
    const descriptors = Object.fromEntries(
      TABS.map(t => [
        `${t.name}-key`,
        {
          options: {
            title: t.title,
            tabBarIcon: ({ focused, color, size }: { focused: boolean; color: string; size: number }) => (
              <DriverTabBarIcon route={t.name} focused={focused} color={color} size={size} />
            ),
          },
        },
      ]),
    )
    const navigation = {
      emit: () => ({ defaultPrevented: false }),
      navigate: (name: string) => setIndex(TABS.findIndex(t => t.name === name)),
    }
    return { state: { index, routes }, descriptors, navigation, insets: { top: 0, bottom: 0, left: 0, right: 0 } } as unknown as BottomTabBarProps
  }, [index])

  if (!__DEV__) return <Redirect href="/(auth)" />

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.background.val }]}>
      <Text style={[styles.banner, { color: theme.textSecondary.val }]}>DEV tab bar preview · no login</Text>
      <NavigationBar {...props} />
    </View>
  )
}

const styles = StyleSheet.create({
  banner: { marginTop: 80, textAlign: 'center', fontSize: 13 },
})
