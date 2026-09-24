import { View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'

/** Fixed slot — Material icons at 26px per ui-mobile (icon-only tabs). */
export const TAB_BAR_ICON_SIZE = 26
export const TAB_BAR_ICON_SLOT = 30

export type DriverTabRoute = 'index' | 'dashboard' | 'earnings' | 'profile'

type MaterialName = keyof typeof MaterialCommunityIcons.glyphMap

/**
 * Material Community Icons (Material Design family) — filled / outline pairs.
 * Prefer this over Ionicons for tab chrome (foundation / M3-adjacent look).
 */
export const DRIVER_TAB_ICONS: Record<
  DriverTabRoute,
  { on: MaterialName; off: MaterialName; a11y: string }
> = {
  index: { on: 'map', off: 'map-outline', a11y: 'Trang chủ, bản đồ' },
  dashboard: { on: 'car', off: 'car-outline', a11y: 'Chuyến đi' },
  earnings: { on: 'wallet', off: 'wallet-outline', a11y: 'Thu nhập' },
  profile: { on: 'account-circle', off: 'account-circle-outline', a11y: 'Cá nhân' },
}

export function DriverTabBarIcon({
  route,
  size = TAB_BAR_ICON_SIZE,
  color,
  focused,
}: {
  route: DriverTabRoute
  size?: number
  color: string
  focused: boolean
}) {
  const g = DRIVER_TAB_ICONS[route]
  return (
    <View
      style={{ width: TAB_BAR_ICON_SLOT, height: TAB_BAR_ICON_SLOT, alignItems: 'center', justifyContent: 'center' }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <MaterialCommunityIcons name={focused ? g.on : g.off} size={size} color={color} />
    </View>
  )
}

/** Empty slot under the raised Trợ lý orb — same footprint as tab icons. */
export function TabBarAiSlotSpacer() {
  return <View style={{ width: TAB_BAR_ICON_SLOT, height: TAB_BAR_ICON_SLOT }} />
}
