import { View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

/** Fixed slot so map / chuyến / thu nhập / cá nhân align with the center orb column. */
export const TAB_BAR_ICON_SIZE = 24
export const TAB_BAR_ICON_SLOT = 28

export type DriverTabRoute = 'index' | 'dashboard' | 'earnings' | 'profile'

/** Semantic Ionicons — one place to tune first-impression tab bar. */
export const DRIVER_TAB_ICONS: Record<
  DriverTabRoute,
  { on: keyof typeof Ionicons.glyphMap; off: keyof typeof Ionicons.glyphMap; a11y: string }
> = {
  index: { on: 'map', off: 'map-outline', a11y: 'Trang chủ, bản đồ' },
  dashboard: { on: 'car', off: 'car-outline', a11y: 'Chuyến đi' },
  earnings: { on: 'cash', off: 'cash-outline', a11y: 'Thu nhập' },
  profile: { on: 'person-circle', off: 'person-circle-outline', a11y: 'Cá nhân' },
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
      <Ionicons name={focused ? g.on : g.off} size={size} color={color} />
    </View>
  )
}

/** Empty slot under the raised Trợ lý orb — same footprint as tab icons (no label). */
export function TabBarAiSlotSpacer() {
  return <View style={{ width: TAB_BAR_ICON_SLOT, height: TAB_BAR_ICON_SLOT }} />
}
