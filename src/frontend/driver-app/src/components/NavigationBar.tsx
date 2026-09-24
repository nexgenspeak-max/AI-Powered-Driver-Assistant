/**
 * NavigationBar.tsx
 * -----------------------------------------------------------------------
 * Material 3 bottom Navigation Bar for the driver tab shell. Replaces the
 * old floating "liquid glass" island (LiquidGlassTabBar):
 *
 *  - edge-attached, full width, 80dp + bottom safe-area inset
 *  - `$surfaceElevated` surface, hairline `$outlineVariant` top edge,
 *    8dp top corner radius, soft upward elevation shadow
 *  - icon-only destinations (meaning carried by the icon + a Vietnamese
 *    `accessibilityLabel`); filled when active, outline when inactive
 *  - active indicator = a short `$primary` line along the tab's TOP edge,
 *    sliding between tabs (Reanimated, 200ms, honours reduce-motion)
 *  - the AI assistant orb stays docked in the centre slot, rising
 *    `BUTTON_RISE` above the bar's top edge (rendered as a sibling so the
 *    bar's own bounds don't clip it)
 *
 * All colours come from Tamagui tokens — no hardcoded hex/rgba.
 *
 * Same file serves web (react-native-web) — no Skia here, so no `.web`
 * split is needed the way the old glass bar required one.
 */

import { memo, useEffect, useRef, useState } from 'react'
import { LayoutChangeEvent, Pressable, StyleSheet, View } from 'react-native'
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme, useThemeName } from 'tamagui'
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs'
import { haptics } from '../utils/haptics'
import { NAV_BAR_HEIGHT } from '../constants/layout'
import { AssistantTabButton } from './AssistantTabButton'
import { TAB_BAR_ICON_SIZE, TabBarAiSlotSpacer } from './tabBarIcons'

const TOP_CORNER_RADIUS = 8
const INDICATOR_HEIGHT = 3
// Fraction of a slot's width the active indicator line spans.
const INDICATOR_WIDTH_RATIO = 0.52
const MOVE_MS = 200

function NavigationBarInner({ state, descriptors, navigation }: BottomTabBarProps) {
  const theme = useTheme()
  const isLight = useThemeName() === 'light'
  const insets = useSafeAreaInsets()
  const reduced = useReducedMotion()

  // Hidden routes (`href: null`) are flagged with tabBarItemStyle.display:'none'
  // — same filter the default tab bar uses.
  const visibleRoutes = state.routes.filter(
    (route) =>
      StyleSheet.flatten(descriptors[route.key].options.tabBarItemStyle)?.display !== 'none',
  )
  const selectedKey = state.routes[state.index]?.key
  // -1 while on a hidden route (`href: null`, e.g. Settings pushed from
  // Profile) — keep the indicator parked on the last real tab, don't snap
  // it back to tab 0.
  const foundIndex = visibleRoutes.findIndex((route) => route.key === selectedKey)
  const lastVisible = useRef(0)
  useEffect(() => {
    if (foundIndex !== -1) lastVisible.current = foundIndex
  }, [foundIndex])
  const activeIndex = foundIndex !== -1 ? foundIndex : lastVisible.current

  // The assistant orb owns the middle slot: real tabs shift outward to make
  // room, e.g. 4 routes -> [route0, route1, AI, route2, route3].
  const aiSlotIndex = Math.floor(visibleRoutes.length / 2)
  const slotCount = visibleRoutes.length + 1

  const [barWidth, setBarWidth] = useState(0)
  const slotW = barWidth > 0 ? barWidth / slotCount : 0
  const indicatorW = slotW * INDICATOR_WIDTH_RATIO
  // Real-route index -> slot index once the AI slot is inserted ahead of it.
  const activeSlot = activeIndex < aiSlotIndex ? activeIndex : activeIndex + 1
  const aiCenterX = aiSlotIndex * slotW + slotW / 2

  const tx = useSharedValue(0)
  const placed = useRef(false)
  useEffect(() => {
    if (slotW === 0) return
    const target = activeSlot * slotW + (slotW - indicatorW) / 2
    // First real placement jumps (no slide in from the left edge on mount).
    tx.value = reduced || !placed.current ? target : withTiming(target, { duration: MOVE_MS })
    placed.current = true
  }, [activeSlot, slotW, indicatorW, reduced, tx])

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }],
    width: indicatorW,
  }))

  const onPress = (routeName: string, routeKey: string, isFocused: boolean) => {
    const event = navigation.emit({ type: 'tabPress', target: routeKey, canPreventDefault: true })
    if (!isFocused && !event.defaultPrevented) {
      haptics.selection()
      navigation.navigate(routeName)
    }
  }

  return (
    <View
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: NAV_BAR_HEIGHT + insets.bottom,
        paddingBottom: insets.bottom,
        backgroundColor: theme.surfaceElevated.val,
        borderTopLeftRadius: TOP_CORNER_RADIUS,
        borderTopRightRadius: TOP_CORNER_RADIUS,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderColor: theme.outlineVariant.val,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: isLight ? 0.1 : 0.4,
        shadowRadius: isLight ? 12 : 16,
        elevation: 12,
      }}
      onLayout={(e: LayoutChangeEvent) => setBarWidth(e.nativeEvent.layout.width)}
    >
      <View style={[styles.row, { height: NAV_BAR_HEIGHT }]}>
        {barWidth > 0 && (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.indicator,
              { backgroundColor: theme.primary.val },
              indicatorStyle,
            ]}
          />
        )}

        {Array.from({ length: slotCount }).map((_, slot) => {
          if (slot === aiSlotIndex) {
            return (
              <View key="ai-slot" pointerEvents="none" style={styles.slot}>
                <TabBarAiSlotSpacer />
              </View>
            )
          }
          const routeIndex = slot < aiSlotIndex ? slot : slot - 1
          const route = visibleRoutes[routeIndex]
          const { options } = descriptors[route.key]
          const isFocused = routeIndex === activeIndex
          const label = options.title ?? route.name
          const color = isFocused ? theme.primary.val : theme.textSecondary.val
          const icon = options.tabBarIcon?.({ focused: isFocused, color, size: TAB_BAR_ICON_SIZE })

          return (
            <Pressable
              key={route.key}
              onPress={() => onPress(route.name, route.key, isFocused)}
              accessibilityRole="button"
              accessibilityState={{ selected: isFocused }}
              accessibilityLabel={label}
              android_ripple={{ color: theme.primaryMuted.val, borderless: true }}
              style={({ pressed }) => [styles.slot, { opacity: pressed ? 0.6 : 1 }]}
            >
              {icon}
            </Pressable>
          )
        })}
      </View>

      {/* Sibling of the row (not clipped): rises above the bar's top edge. */}
      <AssistantTabButton centerX={aiCenterX} barWidth={barWidth} showLabel={false} />
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  slot: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  indicator: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: INDICATOR_HEIGHT,
    borderBottomLeftRadius: INDICATOR_HEIGHT,
    borderBottomRightRadius: INDICATOR_HEIGHT,
  },
})

export const NavigationBar = memo(NavigationBarInner)
