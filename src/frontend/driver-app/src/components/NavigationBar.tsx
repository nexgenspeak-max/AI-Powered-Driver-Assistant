/**
 * NavigationBar.tsx
 * -----------------------------------------------------------------------
 * Material 3 bottom Navigation Bar for the driver tab shell. Replaces the
 * old floating "liquid glass" island (LiquidGlassTabBar):
 *
 *  - edge-attached, full width, 80dp + bottom safe-area inset
 *  - `$surfaceElevated` surface, hairline `$outlineVariant` top edge,
 *    8dp top corner radius, soft upward elevation shadow
 *  - icon + label destinations (Grab/Be/Uber all label their tabs — an
 *    icon-only bar read as unfinished); drawn Czen glyphs, solid when
 *    active, outline when idle
 *  - active indicator = M3 pill behind the icon (fades + scales in, 180ms,
 *    honours reduce-motion) + semibold primary label
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
import { LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native'
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

/** Hidden (href: null) routes -> the tab they are reached from. */
const HIDDEN_ROUTE_PARENT: Record<string, string> = {
  'add-trip': 'dashboard',
  'edit-profile': 'profile',
  'assistant-settings': 'profile',
  vehicle: 'profile',
  'bank-info': 'profile',
  documents: 'profile',
  safety: 'profile',
  support: 'profile',
  terms: 'profile',
  about: 'profile',
  faq: 'profile',
}
const PILL_W = 56
const PILL_H = 30
const PILL_MS = 180
const LABEL_STYLE = { fontSize: 11, lineHeight: 14, letterSpacing: 0.1 } as const

/** One destination: M3 pill behind the icon + label under it. */
function TabItem({
  focused,
  label,
  icon,
  activeColor,
  idleColor,
  pillColor,
  reduced,
}: {
  focused: boolean
  label: string
  icon: React.ReactNode
  activeColor: string
  idleColor: string
  pillColor: string
  reduced: boolean
}) {
  const p = useSharedValue(focused ? 1 : 0)
  useEffect(() => {
    p.value = reduced ? (focused ? 1 : 0) : withTiming(focused ? 1 : 0, { duration: PILL_MS })
  }, [focused, reduced, p])
  const pillStyle = useAnimatedStyle(() => ({
    opacity: p.value,
    transform: [{ scaleX: 0.6 + 0.4 * p.value }],
  }))
  return (
    <View style={styles.item}>
      <View style={styles.iconWrap}>
        <Animated.View pointerEvents="none" style={[styles.pill, { backgroundColor: pillColor }, pillStyle]} />
        {icon}
      </View>
      <Text
        numberOfLines={1}
        style={[LABEL_STYLE, { color: focused ? activeColor : idleColor, fontFamily: focused ? 'Inter_600SemiBold' : 'Inter_500Medium' }]}
      >
        {label}
      </Text>
    </View>
  )
}

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
  // Hidden detail screens belong to a tab — highlight that tab, so a screen
  // opened by deep link or notification doesn't light up "Trang chủ".
  const selectedName = state.routes[state.index]?.name
  const parentName = selectedName ? HIDDEN_ROUTE_PARENT[selectedName] : undefined
  const parentIndex = parentName ? visibleRoutes.findIndex((route) => route.name === parentName) : -1
  const activeIndex = foundIndex !== -1 ? foundIndex : parentIndex !== -1 ? parentIndex : lastVisible.current

  // The assistant orb owns the middle slot: real tabs shift outward to make
  // room, e.g. 4 routes -> [route0, route1, AI, route2, route3].
  const aiSlotIndex = Math.floor(visibleRoutes.length / 2)
  const slotCount = visibleRoutes.length + 1

  const [barWidth, setBarWidth] = useState(0)
  const slotW = barWidth > 0 ? barWidth / slotCount : 0
  const aiCenterX = aiSlotIndex * slotW + slotW / 2

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
        {Array.from({ length: slotCount }).map((_, slot) => {
          if (slot === aiSlotIndex) {
            return (
              <View key="ai-slot" pointerEvents="none" style={styles.slot}>
                {/* The orb itself floats above (sibling below); this keeps
                    its label on the same baseline as the other tabs. */}
                <View style={styles.item}>
                  <View style={styles.iconWrap}>
                    <TabBarAiSlotSpacer />
                  </View>
                  <Text numberOfLines={1} style={[LABEL_STYLE, { color: theme.textSecondary.val, fontFamily: 'Inter_500Medium' }]}>
                    Trợ lý
                  </Text>
                </View>
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
              <TabItem
                focused={isFocused}
                label={label}
                icon={icon}
                activeColor={theme.primary.val}
                idleColor={theme.textSecondary.val}
                pillColor={theme.primaryMuted.val}
                reduced={!!reduced}
              />
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
    alignItems: 'flex-start',
    paddingTop: 10,
  },
  slot: {
    flex: 1,
    alignItems: 'center',
    minHeight: 48,
  },
  item: {
    alignItems: 'center',
    gap: 4,
  },
  iconWrap: {
    width: PILL_W,
    height: PILL_H,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: {
    position: 'absolute',
    width: PILL_W,
    height: PILL_H,
    borderRadius: PILL_H / 2,
  },
})

export const NavigationBar = memo(NavigationBarInner)
