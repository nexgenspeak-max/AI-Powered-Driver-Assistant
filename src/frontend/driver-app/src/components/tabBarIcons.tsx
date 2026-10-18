import { View } from 'react-native'
import { Icon, type IconName } from './icons'

/** Czen glyphs at 26pt in a fixed 30pt slot (icon-only tabs). */
export const TAB_BAR_ICON_SIZE = 26
export const TAB_BAR_ICON_SLOT = 30

export type DriverTabRoute = 'index' | 'dashboard' | 'earnings' | 'profile'

/**
 * One drawn glyph per tab; the selected state is the same glyph in duotone
 * (tinted body + heavier stroke, see icons/Icon.tsx) rather than a swap to
 * an unrelated filled font glyph, so the bar never "jumps" shape on tap.
 */
export const DRIVER_TAB_ICONS: Record<DriverTabRoute, { icon: IconName; a11y: string }> = {
  index: { icon: 'map', a11y: 'Trang chủ, bản đồ' },
  dashboard: { icon: 'car', a11y: 'Chuyến đi' },
  earnings: { icon: 'wallet', a11y: 'Thu nhập' },
  profile: { icon: 'profile', a11y: 'Cá nhân' },
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
      <Icon name={DRIVER_TAB_ICONS[route].icon} size={size} color={color} active={focused} />
    </View>
  )
}

/** Empty slot under the raised Trợ lý orb — same footprint as tab icons. */
export function TabBarAiSlotSpacer() {
  return <View style={{ width: TAB_BAR_ICON_SLOT, height: TAB_BAR_ICON_SLOT }} />
}
