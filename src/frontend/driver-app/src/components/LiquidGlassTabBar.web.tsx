/**
 * LiquidGlassTabBar.web.tsx
 * -----------------------------------------------------------------------
 * Web fallback for LiquidGlassTabBar.tsx — same reasoning as
 * GlassButton.web.tsx/GlassSurface.web.tsx elsewhere in this app: the
 * native version's `Skia.RuntimeEffect.Make(...)` shader compiles at
 * module load time, but on web `@shopify/react-native-skia`'s CanvasKit
 * backend loads asynchronously (WASM) — `Skia.RuntimeEffect` is still
 * `undefined` when that top-level call runs, which crashes the whole
 * bundle on import ("Cannot read properties of undefined (reading
 * 'RuntimeEffect')"). This version drops Skia entirely and reaches for
 * real CSS `backdropFilter: blur(...)` instead (react-native-web passes
 * arbitrary style keys straight through to the DOM), which gets the same
 * frosted-glass read without any shader — no refraction distortion (that
 * part genuinely needs the native shader), just blur + tint + a bright
 * rim, same as GlassButton.web.tsx's "overlay, not fill" approach.
 *
 * Same background treatment as the native version — sized/positioned/
 * shadowed to be pixel-identical to this app's *original* tab bar
 * (GlassTabButton + GlassMaterial, still intact in driver-app's
 * `_layout.tsx`): a floating island (`position:absolute, left:20,
 * right:20, bottom:16, borderRadius:30`), not a full-width docked bar —
 * the reference file's fully transparent bar read as broken/washed-out
 * once wired in, so both platform variants paint a real surface now, but
 * neither one moved the bar's own placement or shape.
 *
 * Metro/React Native picks this file over LiquidGlassTabBar.tsx on web
 * automatically (platform-extension resolution) — same three exports,
 * same props, so `_layout.tsx` doesn't need to know which one loaded.
 */

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { LayoutChangeEvent, StyleSheet, View } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import { BlurView } from 'expo-blur'
import { LinearGradient } from 'expo-linear-gradient'
import { useThemeName } from 'tamagui'
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs'
import { GLASS_BORDER_COLOR } from './LiquidGlass'
import { AssistantTabButton } from './AssistantTabButton'
import { TAB_BAR_ICON_SIZE, TabBarAiSlotSpacer } from './tabBarIcons'
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated'

// =========================================================================
// 1. CONTEXT — identical to the native version (no Skia involved here)
// =========================================================================
type LiquidGlassContextType = {
  pageBlur: SharedValue<number>
}

const LiquidGlassContext = createContext<LiquidGlassContextType | null>(null)

export function LiquidGlassProvider({ children }: { children: ReactNode }) {
  const pageBlur = useSharedValue(0)
  return <LiquidGlassContext.Provider value={{ pageBlur }}>{children}</LiquidGlassContext.Provider>
}

function useLiquidGlass() {
  const ctx = useContext(LiquidGlassContext)
  if (!ctx) {
    throw new Error('LiquidGlassTabBar: wrap the app in <LiquidGlassProvider> before using this.')
  }
  return ctx
}

// =========================================================================
// 2. PAGE BLUR OVERLAY — CSS backdrop-filter instead of Skia BackdropBlur
// =========================================================================
const PAGE_BLUR_MAX = 18

export function PageBlurOverlay({ children }: { children: ReactNode }) {
  const { pageBlur } = useLiquidGlass()

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: Math.min(pageBlur.value / PAGE_BLUR_MAX, 1),
    // Web-only CSS escape hatch — not part of RN's ViewStyle type, same
    // trick GlassButton.web.tsx uses for `backgroundImage`.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    backdropFilter: `blur(${pageBlur.value}px)` as any,
  }))

  return (
    <View style={{ flex: 1 }}>
      {children}
      <Animated.View
        style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255,255,255,0.08)' }, overlayStyle]}
        pointerEvents="none"
      />
    </View>
  )
}

// =========================================================================
// 3. CONFIG — identical constants to the native version
// =========================================================================
// Matches the original GlassTabButton+GlassMaterial floating-island bar
// exactly (see driver-app's app/(app)/_layout.tsx, untouched) — same
// height/radius/margins/shadow, so restyling this away and back didn't
// leave the placement/shape any different from before this experiment.
// Was 76 — a bit taller per request.
const CONTENT_HEIGHT = 84
const BAR_RADIUS = 30
// Was 20 — widened per request so the bar spans more of the screen (also
// gives each tab's own slot a bit more room now that a 5th slot is shared
// with the AI button). Matches the same reduction on the native tab bar.
const BAR_SIDE_MARGIN = 10
const BAR_BOTTOM_MARGIN = 16
// Inset within a tab column; outer edge tabs use PILL_BAR_EDGE_INSET so the
// active fill clears the bar's rounded end (Trang chủ / Cá nhân).
const PILL_SLOT_INSET = 4
const PILL_BAR_EDGE_INSET = 12

function pillInsetsForTabIndex(tabIndex: number, routeCount: number) {
  'worklet'
  const isFirst = tabIndex === 0
  const isLast = tabIndex === routeCount - 1
  return {
    left: isFirst ? PILL_BAR_EDGE_INSET : PILL_SLOT_INSET,
    right: isLast ? PILL_BAR_EDGE_INSET : PILL_SLOT_INSET,
  }
}

const LEADING_SPRING = { damping: 14, stiffness: 220, mass: 0.6 }
const TRAILING_SPRING = { damping: 18, stiffness: 120, mass: 0.9 }

const BLUR_IN = { duration: 90, easing: Easing.out(Easing.cubic) }
const BLUR_OUT = { duration: 260, easing: Easing.out(Easing.cubic) }
const PAGE_BLUR_IN = { duration: 220, easing: Easing.out(Easing.cubic) }
const PAGE_BLUR_OUT = { duration: 260, easing: Easing.out(Easing.cubic) }

const PRESSED_BLUR = 14
const IDLE_BLUR = 0.5

const TAP_HOLD_AFTER_RELEASE = 1000 // ms — pill stays glassy after release
const LONG_PRESS_DELAY = 350 // ms — threshold to count as a "hold"
const DRAG_THRESHOLD = 10 // px — beyond this, it's a drag, not a held-still long-press

// Byte-for-byte the original bar's shadow (driver-app's `tabBarStyle`) —
// not theme-dependent, unlike the GlassMaterial/Card shadow helpers.
function getBarShadow() {
  return {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 0,
  } as const
}

// `insets` intentionally unused — the original bar ignored safe-area too
// (floats a fixed 16px up regardless), see BAR_BOTTOM_MARGIN above.
export function LiquidGlassTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { pageBlur } = useLiquidGlass()
  const isLight = useThemeName() === 'light'

  const visibleRoutes = state.routes.filter(
    route => StyleSheet.flatten(descriptors[route.key].options.tabBarItemStyle)?.display !== 'none',
  )
  const selectedKey = state.routes[state.index]?.key
  const selectedIndex = Math.max(
    0,
    visibleRoutes.findIndex(route => route.key === selectedKey),
  )

  // The AI button takes up its own slot in the row (so the real tabs shift
  // over to make room for it, evenly re-spacing) — inserted at the middle
  // slot, e.g. 4 routes -> [route0, route1, AI, route2, route3]. Real routes
  // keep their own indices for `tabLayouts`/`indexAtX`/`moveTo` below (all
  // keyed by route position, unaffected by the spacer) — only the row's
  // render loop and the pill's own width math need to know about the slot.
  const aiSlotIndex = Math.floor(visibleRoutes.length / 2)
  const slotCount = visibleRoutes.length + 1

  const [barWidth, setBarWidth] = useState(0)
  // The label color's own source of truth — see the native
  // LiquidGlassTabBar.tsx for the full explanation. Kept in local state
  // (updated in the same gesture callback that moves the pill) instead of
  // derived from `selectedIndex` (the router's async state), so the pill
  // and the purple label can never end up pointing at different tabs.
  const [visualIndex, setVisualIndex] = useState(() => selectedIndex)
  const tabLayouts = useRef<{ x: number; width: number }[]>([])
  const initialized = useRef(false)
  // Which tab the pill is currently tracking during a press/drag — kept as
  // a plain ref (not state) since it only drives a worklet animation, never
  // a re-render.
  const activeIndex = useRef(0)
  // The index we most recently asked React Navigation to go to, and are
  // still waiting to see reflected in `selectedIndex` — see the identical
  // ref in the native LiquidGlassTabBar.tsx for the full explanation.
  const pendingTarget = useRef<number | null>(null)
  // Safety valve for `pendingTarget` — see the identical ref in the native
  // LiquidGlassTabBar.tsx for the full explanation (bounds how long a
  // mismatched confirmation can block reconciliation, so it can't get stuck
  // forever).
  const pendingTargetTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isLongPress = useRef(false)
  // Set once a touch has moved past DRAG_THRESHOLD — cancels the pending
  // long-press timer and switches the release behavior from "reopen page
  // blur" to "navigate to whichever tab the finger ended up over".
  const didDrag = useRef(false)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const leftEdge = useSharedValue(0)
  const rightEdge = useSharedValue(0)
  const blurAmount = useSharedValue(IDLE_BLUR)
  const rimIntensity = useSharedValue(0.15)

  const moveTo = useCallback(
    (index: number) => {
      'worklet'
      const layout = tabLayouts.current[index]
      if (!layout) return

      const insets = pillInsetsForTabIndex(index, visibleRoutes.length)
      const targetLeft = layout.x + insets.left
      const targetRight = layout.x + layout.width - insets.right
      const movingRight = targetLeft > leftEdge.value

      if (movingRight) {
        rightEdge.value = withSpring(targetRight, LEADING_SPRING)
        leftEdge.value = withSpring(targetLeft, TRAILING_SPRING)
      } else {
        leftEdge.value = withSpring(targetLeft, LEADING_SPRING)
        rightEdge.value = withSpring(targetRight, TRAILING_SPRING)
      }
    },
    [leftEdge, rightEdge, visibleRoutes.length],
  )

  const onTabLayout = (index: number) => (e: LayoutChangeEvent) => {
    const { x, width } = e.nativeEvent.layout
    tabLayouts.current[index] = { x, width }

    if (!initialized.current && index === selectedIndex) {
      const insets = pillInsetsForTabIndex(index, visibleRoutes.length)
      leftEdge.value = x + insets.left
      rightEdge.value = x + width - insets.right
      initialized.current = true
    }
  }

  // Reconciles the pill to wherever the route ACTUALLY is, whenever
  // `selectedIndex` changes for any reason — see the native
  // LiquidGlassTabBar.tsx's identical effect for the full explanation (a
  // fast drag-across fires `navigateTo` for several tabs in quick
  // succession; those async `navigation.navigate()` calls can resolve to a
  // different tab than wherever the pill last visually parked, and nothing
  // else ever corrected that mismatch).
  useEffect(() => {
    if (!initialized.current) return
    // Ignore a stale confirmation of a tap we've since been superseded by —
    // see the identical guard in the native LiquidGlassTabBar.tsx for the
    // full explanation. Only reconcile once `selectedIndex` catches up to
    // whatever we most recently asked for.
    if (pendingTarget.current !== null && selectedIndex !== pendingTarget.current) return
    if (pendingTargetTimer.current) {
      clearTimeout(pendingTargetTimer.current)
      pendingTargetTimer.current = null
    }
    pendingTarget.current = null
    activeIndex.current = selectedIndex
    setVisualIndex(selectedIndex)
    moveTo(selectedIndex)
  }, [selectedIndex, moveTo])

  // Maps a touch's X (row-local, same coordinate space `onTabLayout` reads
  // from) to whichever tab column it falls in — clamped to the first/last
  // tab if the finger drags past either end of the bar.
  const indexAtX = (x: number) => {
    const layouts = tabLayouts.current
    for (let i = 0; i < layouts.length; i++) {
      const l = layouts[i]
      if (l && x >= l.x && x < l.x + l.width) return i
    }
    if (layouts.length === 0) return activeIndex.current
    return x < (layouts[0]?.x ?? 0) ? 0 : layouts.length - 1
  }

  const clearLongPressTimer = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }

  const navigateTo = (index: number) => {
    const route = visibleRoutes[index]
    if (!route) return
    const isFocused = selectedIndex === index
    const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true })
    if (!isFocused && !event.defaultPrevented) {
      // Recorded before the (async) navigate call — see the identical
      // comment in the native LiquidGlassTabBar.tsx.
      pendingTarget.current = index
      if (pendingTargetTimer.current) clearTimeout(pendingTargetTimer.current)
      pendingTargetTimer.current = setTimeout(() => {
        pendingTarget.current = null
      }, 500)
      navigation.navigate(route.name, route.params)
    } else {
      pendingTarget.current = null
      if (pendingTargetTimer.current) {
        clearTimeout(pendingTargetTimer.current)
        pendingTargetTimer.current = null
      }
    }
  }

  // Navigating from this effect (reacting to `visualIndex`) caused "Maximum
  // update depth exceeded" — see the native LiquidGlassTabBar.tsx's identical
  // fix for the full explanation: `navigateTo` → `navigation.navigate()`
  // eventually changes `selectedIndex`, which the reconciliation effect above
  // reacts to by calling `setVisualIndex`/`moveTo` again, and the two effects
  // can re-trigger each other. Navigation now happens directly from the
  // gesture handlers below instead.

  // Touch down: show the glass pill at whichever tab is under the finger,
  // and arm the long-press timer (fires unless the finger drags away first).
  const onGestureBegin = (x: number) => {
    const index = indexAtX(x)
    activeIndex.current = index
    setVisualIndex(index)
    isLongPress.current = false
    didDrag.current = false
    moveTo(index)
    blurAmount.value = withTiming(PRESSED_BLUR, BLUR_IN)
    rimIntensity.value = withTiming(0.65, BLUR_IN)

    clearLongPressTimer()
    longPressTimer.current = setTimeout(() => {
      if (didDrag.current) return
      isLongPress.current = true
      pageBlur.value = withTiming(PAGE_BLUR_MAX, PAGE_BLUR_IN)
    }, LONG_PRESS_DELAY)
  }

  // Finger moved: past DRAG_THRESHOLD, this is a drag, not a held-still
  // long-press — cancel the timer (and the page blur if it already fired),
  // then let the pill follow whichever tab the finger is currently over.
  const onGestureUpdate = (x: number, translationX: number, translationY: number) => {
    if (!didDrag.current && (Math.abs(translationX) > DRAG_THRESHOLD || Math.abs(translationY) > DRAG_THRESHOLD)) {
      didDrag.current = true
      clearLongPressTimer()
      if (isLongPress.current) {
        isLongPress.current = false
        pageBlur.value = withTiming(0, PAGE_BLUR_OUT)
      }
    }

    const index = indexAtX(x)
    if (index !== activeIndex.current) {
      activeIndex.current = index
      setVisualIndex(index)
      moveTo(index)
      navigateTo(index)
    }
  }

  // Release: a plain tap (no drag) never fires `onGestureUpdate` — there's
  // no position change to react to — so this is what actually navigates for
  // that case. A drag that already crossed into another tab already
  // navigated there in `onGestureUpdate`; calling `navigateTo` again here is
  // a harmless no-op then. A held-still long-press just closes the page blur
  // (a "peek", not a selection) and skips navigating.
  const onGestureEnd = () => {
    clearLongPressTimer()
    if (isLongPress.current) {
      pageBlur.value = withTiming(0, PAGE_BLUR_OUT)
      blurAmount.value = withTiming(IDLE_BLUR, BLUR_OUT)
      rimIntensity.value = withTiming(0.15, BLUR_OUT)
    } else {
      navigateTo(activeIndex.current)
      blurAmount.value = withDelay(TAP_HOLD_AFTER_RELEASE, withTiming(IDLE_BLUR, BLUR_OUT))
      rimIntensity.value = withDelay(TAP_HOLD_AFTER_RELEASE, withTiming(0.15, BLUR_OUT))
    }
    isLongPress.current = false
    didDrag.current = false
  }

  // `minDistance(0)` — activate on touch-down, not after some initial
  // travel, so the pill/long-press timer both start immediately like the
  // original per-tab Pressable did. Callbacks hop to the JS thread
  // (`runOnJS`) since they call `setTimeout`/`navigation.navigate`, neither
  // worklet-safe.
  const panGesture = Gesture.Pan()
    .minDistance(0)
    .onBegin(e => {
      runOnJS(onGestureBegin)(e.x)
    })
    .onUpdate(e => {
      runOnJS(onGestureUpdate)(e.x, e.translationX, e.translationY)
    })
    .onEnd(() => {
      runOnJS(onGestureEnd)()
    })

  const pillHeight = useDerivedValue(() => {
    const width = rightEdge.value - leftEdge.value
    const baseWidth = barWidth > 0 ? barWidth / slotCount - (PILL_SLOT_INSET + PILL_BAR_EDGE_INSET) : width
    const stretchRatio = baseWidth > 0 ? width / baseWidth : 1
    const squash = 1 - Math.min(Math.max(stretchRatio - 1, 0), 0.4) * 0.25
    return CONTENT_HEIGHT * 0.7 * squash
  })

  // Approximate uniform-width center (real tabs are `flex: 1` across
  // `slotCount` slots, AI slot included) — doesn't need the same
  // measured-layout precision the pill uses, just a reasonable anchor for
  // the button to sit at.
  const aiCenterX = barWidth > 0 ? aiSlotIndex * (barWidth / slotCount) + barWidth / slotCount / 2 : 0

  const pillTop = useDerivedValue(() => (CONTENT_HEIGHT - pillHeight.value) / 2)

  // Fill-only active pill — matches native LiquidGlassTabBar.tsx (no stroke).
  // A 1px purple border here stacked on the bar's own 1px glass rim and read
  // as a double/overriding edge, especially at Trang chủ (first tab, top-left
  // corner). Opacity still tracks `rimIntensity` on press/drag.
  const pillStyle = useAnimatedStyle(() => {
    // `leftEdge`/`rightEdge` are spring-driven with different configs per
    // edge (see `moveTo`) so the pill can squash/stretch while moving, but a
    // low-damping spring can overshoot its target — harmless for a middle
    // tab (just eats into a neighbor's column) but visible as the pill
    // spilling past the bar's own rounded corner when overshooting at Home
    // (first tab) or Profile (last). Clamped here, at render time only, so
    // the underlying spring physics/squash feel stay untouched.
    const left = Math.max(PILL_BAR_EDGE_INSET, leftEdge.value)
    const right = barWidth > 0 ? Math.min(barWidth - PILL_BAR_EDGE_INSET, rightEdge.value) : rightEdge.value
    return {
      left,
      top: pillTop.value,
      width: right - left,
      height: pillHeight.value,
      borderRadius: pillHeight.value / 2,
      backgroundColor: isLight
        ? `rgba(124,58,237,${0.12 + rimIntensity.value * 0.2})`
        : `rgba(167,139,250,${0.24 + rimIntensity.value * 0.18})`,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      backdropFilter: `blur(${blurAmount.value}px)` as any,
    }
  })

  return (
    // Floating island, restored to the exact original placement (see
    // driver-app's untouched `_layout.tsx`) — not full-width/docked.
    <View style={{ position: 'absolute', left: BAR_SIDE_MARGIN, right: BAR_SIDE_MARGIN, bottom: BAR_BOTTOM_MARGIN }}>
      <View style={[{ borderRadius: BAR_RADIUS }, getBarShadow()]}>
        <View
          style={{ height: CONTENT_HEIGHT, borderRadius: BAR_RADIUS }}
          onLayout={e => setBarWidth(e.nativeEvent.layout.width)}
        >
          {/* Visual-only layer, clipped to the rounded shape — split out
              from the touch row below because `overflow:'hidden'` on a
              shared ancestor clips pointer-event hit-testing on web too
              (CSS `border-radius` + `overflow:hidden`), not just rendering
              — see the identical fix/comment in the native
              LiquidGlassTabBar.tsx for the full explanation (first/last
              tab's outer edge, under the bar's own rounded corner, wasn't
              registering taps). */}
          <View style={[StyleSheet.absoluteFill, { borderRadius: BAR_RADIUS, overflow: 'hidden' }]} pointerEvents="none">
            {/* Real frosted background, the exact GlassMaterial recipe
                (BlurView + a top-bright/bottom-dim wash + a brighter top
                border) — not GlassMaterial itself, since its children slot
                forces `alignItems/justifyContent: center`, which would
                shrink-wrap and center the tab row instead of letting it
                stretch full-width. Same visual result, just laid out by
                this component instead of delegated to it. */}
            <BlurView
              tint={isLight ? 'light' : 'dark'}
              intensity={60}
              experimentalBlurMethod="dimezisBlurView"
              style={StyleSheet.absoluteFill}
            />
            <LinearGradient
              colors={isLight ? ['rgba(255,255,255,0.35)', 'rgba(255,255,255,0.12)', 'rgba(255,255,255,0.03)'] : ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.03)', 'rgba(255,255,255,0.015)']}
              locations={[0, 0.35, 1]}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View
              style={[
                StyleSheet.absoluteFill,
                {
                  borderRadius: BAR_RADIUS,
                  // Same 1px, same color, on all four sides — same shared
                  // token every other glass surface uses (GLASS_BORDER_COLOR in
                  // LiquidGlass/GlassMaterial.tsx) — was a hardcoded local copy
                  // of these values (and briefly a thicker/brighter top edge)
                  // that could only stay in sync by coincidence.
                  borderWidth: 1,
                  borderColor: isLight ? GLASS_BORDER_COLOR.light : GLASS_BORDER_COLOR.dark,
                },
              ]}
              pointerEvents="none"
            />

            <Animated.View style={[styles.pill, pillStyle]} pointerEvents="none" />
          </View>

          {/* Deliberately NOT inside the clipped view above — see the
              comment on that view for why. */}
          <GestureDetector gesture={panGesture}>
            <View style={[styles.row, { height: CONTENT_HEIGHT }]}>
              {Array.from({ length: slotCount }).map((_, slot) => {
                if (slot === aiSlotIndex) {
                  return (
                    <View key="ai-slot" pointerEvents="none" style={styles.tab}>
                      <TabBarAiSlotSpacer />
                    </View>
                  )
                }
                const index = slot < aiSlotIndex ? slot : slot - 1
                const route = visibleRoutes[index]
                const { options } = descriptors[route.key]
                const isFocused = visualIndex === index
                const label = options.title ?? route.name
                const tintColor = isFocused
                  ? (options.tabBarActiveTintColor ?? '#8B5CF6')
                  : (options.tabBarInactiveTintColor ?? '#888888')
                const icon = options.tabBarIcon?.({ focused: isFocused, color: tintColor, size: TAB_BAR_ICON_SIZE })

                return (
                  <View
                    key={route.key}
                    style={styles.tab}
                    onLayout={onTabLayout(index)}
                    accessible
                    accessibilityRole="button"
                    accessibilityLabel={label}
                    accessibilityState={{ selected: isFocused }}
                  >
                    {icon}
                  </View>
                )
              })}
            </View>
          </GestureDetector>

          {/* Deliberately NOT inside the clipped view above either — same
              reasoning as the row, plus it needs to rise above the bar's
              own top edge, which a clip would cut off. */}
          <AssistantTabButton
            centerX={aiCenterX}
            barWidth={barWidth}
          />
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  pill: {
    position: 'absolute',
  },
  row: {
    flexDirection: 'row',
  },
  tab: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
})
