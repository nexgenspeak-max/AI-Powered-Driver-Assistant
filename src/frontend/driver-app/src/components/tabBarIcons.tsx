import { View } from 'react-native'
import { Icon, type IconName } from './icons'

/** Czen glyphs at 24pt (M3 / HIG tab size) in a fixed 30pt slot. */
export const TAB_BAR_ICON_SIZE = 24
export const TAB_BAR_ICON_SLOT = 30

export type DriverTabRoute = 'index' | 'dashboard' | 'earnings' | 'profile'

/**
 * Drawn pairs (see icons/glyphs.ts): outline when idle, a separately drawn
 * solid glyph with knock-outs when selected — the SF Symbols `.fill` /
 * Material "filled" convention, so selection reads at a glance.
 */
export const DRIVER_TAB_ICONS: Record<DriverTabRoute, { idle: IconName; active: IconName; a11y: string }> = {
  index: { idle: 'home', active: 'home-fill', a11y: 'Trang chủ, bản đồ' },
  dashboard: { idle: 'wheel', active: 'wheel-fill', a11y: 'Chuyến đi' },
  earnings: { idle: 'purse', active: 'purse-fill', a11y: 'Thu nhập' },
  profile: { idle: 'person', active: 'person-fill', a11y: 'Cá nhân' },
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
  return (
    <View
      style={{ width: TAB_BAR_ICON_SLOT, height: TAB_BAR_ICON_SLOT, alignItems: 'center', justifyContent: 'center' }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Icon name={focused ? DRIVER_TAB_ICONS[route].active : DRIVER_TAB_ICONS[route].idle} size={size} color={color} />
    </View>
  )
}

/** Empty slot under the raised Trợ lý orb — same footprint as tab icons. */
export function TabBarAiSlotSpacer() {
  return <View style={{ width: TAB_BAR_ICON_SLOT, height: TAB_BAR_ICON_SLOT }} />
}
