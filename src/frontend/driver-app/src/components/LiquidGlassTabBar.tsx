/**
 * LiquidGlassTabBar.tsx
 * -----------------------------------------------------------------------
 * Floating frosted tab bar with a sliding active pill, plus a raised
 * center "Trợ lý" (AI assistant) button that pokes up above the bar's top
 * edge — replaces the old free-floating draggable GlobalAssistantOrb.tsx,
 * which is no longer mounted anywhere (see app/(app)/_layout.tsx).
 *
 * Rewritten to be light and legible: the previous version stacked a Skia
 * `BackdropFilter` + runtime refraction shader on top of a full-screen
 * `PageBlurOverlay` (a second always-mounted Skia canvas) — that combination
 * was the source of the "transitions lag" and the washed-out, hard-to-read
 * icons/labels in dark mode. This version uses only `expo-blur` + a solid
 * tint for a readable surface, and Reanimated (not Skia) for the pill.
 *
 * `LiquidGlassProvider` is kept as a passthrough so app/(app)/_layout.tsx
 * doesn't need to change; `PageBlurOverlay` is gone.
 */

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { LayoutChangeEvent, Pressable, StyleSheet, View } from 'react-native'
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'
import { BlurView } from 'expo-blur'
import { LinearGradient } from 'expo-linear-gradient'
import { useThemeName } from 'tamagui'
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs'
import { haptics } from '../utils/haptics'
import { AssistantTabButton, BUTTON_SIZE, BUTTON_RISE } from './AssistantTabButton'

// Kept only so existing `<LiquidGlassProvider>` in _layout.tsx keeps working.
export function LiquidGlassProvider({ children }: { children: ReactNode }) {
  return <>{children}</>
}

// Was 16 — widened per request so the bar spans more of the screen (also
// gives each tab's own slot a bit more room now that a 5th slot is shared
// with the AI button).
const SIDE_MARGIN = 8
const BOTTOM_MARGIN = 16
// Was 64 — a bit taller per request.
const HEIGHT = 72
const RADIUS = 28
const PILL_INSET = 8
// Zero horizontal inset — the pill exactly matches each tab's own flex
// slot width (same width the label/icon render into), the widest it can be
// without overlapping the neighboring tab. The AI button's own slot makes
// every real tab's slot narrower than before it existed, and even a small
// inset (4px each side) was still cutting into long labels like "Trang chủ"
// (reported: the "t"/"u" ends sat outside the purple background).
const PILL_H_INSET = 0

const PALETTE = {
  light: {
    tint: 'rgba(255,255,255,0.82)',
    border: 'rgba(255,255,255,0.6)',
    borderTop: 'rgba(255,255,255,0.6)',
    // Crisp inset highlight along the bottom edge — deliberately brighter
    // than the other 3 sides, and no inner top shadow anywhere (glass reads
    // as floating via the outer drop shadow alone, not "carved in").
    borderBottom: 'rgba(255,255,255,0.95)',
    pill: 'rgba(124,58,237,0.12)',
    active: '#7C3AED',
    inactive: '#6B7280',
    blur: 24,
    blurTint: 'light' as const,
  },
  dark: {
    // Exact #15111F (not pure black, not navy) — solid enough that icons/
    // labels read clearly over any moving map/content.
    tint: 'rgba(21,17,31,0.9)',
    border: 'rgba(255,255,255,0.10)',
    // Soft bright top highlight — the dark-mode counterpart to light's
    // bottom highlight, subtler (this theme stays understated overall).
    borderTop: 'rgba(255,255,255,0.22)',
    borderBottom: 'rgba(255,255,255,0.10)',
    pill: 'rgba(167,139,250,0.24)',
    active: '#C4B5FD',
    inactive: '#9BA0A8',
    blur: 32,
    blurTint: 'dark' as const,
  },
}

export function LiquidGlassTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const isLight = useThemeName() === 'light'
  const p = isLight ? PALETTE.light : PALETTE.dark
  const reduced = useReducedMotion()

  // Hidden routes (`href: null`) are marked with tabBarItemStyle.display:'none'
  // — same filter the default tab bar uses.
  const visibleRoutes = state.routes.filter(
    (route) =>
      StyleSheet.flatten(descriptors[route.key].options.tabBarItemStyle)?.display !== 'none',
  )
  const selectedKey = state.routes[state.index]?.key
  const foundIndex = visibleRoutes.findIndex((r) => r.key === selectedKey)
  const lastVisible = useRef(0)
  useEffect(() => {
    if (foundIndex !== -1) lastVisible.current = foundIndex
  }, [foundIndex])
  const activeIndex = foundIndex !== -1 ? foundIndex : lastVisible.current

  // The AI button takes up its own slot in the row (so the real tabs shift
  // over to make room for it, evenly re-spacing) — inserted at the middle
  // slot, e.g. 4 routes -> [route0, route1, AI, route2, route3].
  const aiSlotIndex = Math.floor(visibleRoutes.length / 2)
  const slotCount = visibleRoutes.length + 1

  const [barWidth, setBarWidth] = useState(0)
  // Matches each slot's actual width (laid out with `flex: 1` across the
  // full bar, AI slot included), so the pill always lands centered under
  // its tab and the AI button always lands centered on its own slot.
  const segW = barWidth > 0 ? barWidth / slotCount : 0
  const pillWidth = Math.max(0, segW - PILL_H_INSET * 2)
  // Real-tab index -> its slot index once the AI slot is inserted ahead of it.
  const pillSlotIndex = activeIndex < aiSlotIndex ? activeIndex : activeIndex + 1
  const aiCenterX = aiSlotIndex * segW + segW / 2

  const tx = useSharedValue(0)
  useEffect(() => {
    const target = pillSlotIndex * segW + PILL_H_INSET
    tx.value = reduced ? target : withTiming(target, { duration: 220 })
  }, [pillSlotIndex, segW, reduced, tx])

  const pillStyle = useAnimatedStyle(() => ({ transform: [{ translateX: tx.value }] }))

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
        left: SIDE_MARGIN,
        right: SIDE_MARGIN,
        bottom: BOTTOM_MARGIN,
        height: HEIGHT,
        borderRadius: RADIUS,
        boxShadow: isLight
          ? '0px 12px 28px rgba(17,12,32,0.16)'
          : '0px 14px 32px rgba(0,0,0,0.5)',
      }}
    >
      <View
        style={{ flex: 1, borderRadius: RADIUS, overflow: 'hidden' }}
        onLayout={(e: LayoutChangeEvent) => setBarWidth(e.nativeEvent.layout.width)}
      >
        <BlurView
          tint={p.blurTint}
          intensity={p.blur}
          experimentalBlurMethod="dimezisBlurView"
          style={StyleSheet.absoluteFill}
        />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: p.tint }]} />
        {isLight && (
          // Soft specular highlight streak — a diagonal white wash, not a
          // fixed top-left blob, kept subtle. Dark mode skips this
          // entirely (stays flatter/more understated by design).
          <LinearGradient
            colors={['rgba(255,255,255,0.5)', 'rgba(255,255,255,0.12)', 'rgba(255,255,255,0)']}
            locations={[0, 0.5, 1]}
            start={{ x: 0.12, y: 0 }}
            end={{ x: 0.68, y: 1 }}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
        )}
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              borderRadius: RADIUS,
              borderWidth: 1,
              borderColor: p.border,
              borderTopColor: p.borderTop,
              borderBottomColor: p.borderBottom,
            },
          ]}
          pointerEvents="none"
        />

        {pillWidth > 0 && (
          <Animated.View
            pointerEvents="none"
            style={[
              {
                position: 'absolute',
                top: PILL_INSET,
                bottom: PILL_INSET,
                width: pillWidth,
                borderRadius: RADIUS - PILL_INSET,
                backgroundColor: p.pill,
              },
              pillStyle,
            ]}
          />
        )}

        <View style={{ flex: 1, flexDirection: 'row' }}>
          {Array.from({ length: slotCount }).map((_, slot) => {
            if (slot === aiSlotIndex) {
              // Empty spacer — reserves the AI button's slot width so the
              // real tabs around it space out correctly. The button itself
              // renders below, outside this clipped view, so it can poke
              // up above the bar's top edge.
              return <View key="ai-slot" pointerEvents="none" style={{ flex: 1 }} />
            }
            const routeIndex = slot < aiSlotIndex ? slot : slot - 1
            const route = visibleRoutes[routeIndex]
            const { options } = descriptors[route.key]
            const isFocused = routeIndex === activeIndex
            const label = options.title ?? route.name
            const color = isFocused ? p.active : p.inactive
            const icon = options.tabBarIcon?.({ focused: isFocused, color, size: 24 })
            return (
              <Pressable
                key={route.key}
                onPress={() => onPress(route.name, route.key, isFocused)}
                accessibilityRole="button"
                accessibilityState={{ selected: isFocused }}
                accessibilityLabel={label}
                style={({ pressed }) => ({
                  flex: 1,
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 3,
                  opacity: pressed ? 0.6 : 1,
                })}
              >
                {icon}
                <Animated.Text
                  numberOfLines={1}
                  style={{
                    fontSize: 11,
                    fontFamily: isFocused ? 'Inter_600SemiBold' : 'Inter_500Medium',
                    color,
                  }}
                >
                  {label}
                </Animated.Text>
              </Pressable>
            )
          })}
        </View>
      </View>

      {/* Rendered outside the clipped inner view (sibling, same non-clipped
          outer container) so it can rise above the bar's rounded top edge
          instead of being cut off at it. */}
      <AssistantTabButton
        centerX={aiCenterX}
        barWidth={barWidth}
        labelColor={p.active}
        labelTop={BUTTON_SIZE - BUTTON_RISE + 4}
      />
    </View>
  )
}
