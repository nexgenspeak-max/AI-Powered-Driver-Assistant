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

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'
import { LayoutChangeEvent, StyleSheet, Text, View } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import { BlurView } from 'expo-blur'
import { LinearGradient } from 'expo-linear-gradient'
import { useThemeName } from 'tamagui'
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs'
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
const CONTENT_HEIGHT = 76
const BAR_RADIUS = 30
const BAR_SIDE_MARGIN = 20
const BAR_BOTTOM_MARGIN = 16
const PILL_MARGIN = 6

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

  const [barWidth, setBarWidth] = useState(0)
  const tabLayouts = useRef<{ x: number; width: number }[]>([])
  const initialized = useRef(false)
  // Which tab the pill is currently tracking during a press/drag — kept as
  // a plain ref (not state) since it only drives a worklet animation, never
  // a re-render.
  const activeIndex = useRef(0)
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

      const targetLeft = layout.x + PILL_MARGIN
      const targetRight = layout.x + layout.width - PILL_MARGIN
      const movingRight = targetLeft > leftEdge.value

      if (movingRight) {
        rightEdge.value = withSpring(targetRight, LEADING_SPRING)
        leftEdge.value = withSpring(targetLeft, TRAILING_SPRING)
      } else {
        leftEdge.value = withSpring(targetLeft, LEADING_SPRING)
        rightEdge.value = withSpring(targetRight, TRAILING_SPRING)
      }
    },
    [leftEdge, rightEdge],
  )

  const onTabLayout = (index: number) => (e: LayoutChangeEvent) => {
    const { x, width } = e.nativeEvent.layout
    tabLayouts.current[index] = { x, width }

    if (!initialized.current && index === selectedIndex) {
      leftEdge.value = x + PILL_MARGIN
      rightEdge.value = x + width - PILL_MARGIN
      initialized.current = true
    }
  }

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
      navigation.navigate(route.name, route.params)
    }
  }

  // Touch down: show the glass pill at whichever tab is under the finger,
  // and arm the long-press timer (fires unless the finger drags away first).
  const onGestureBegin = (x: number) => {
    const index = indexAtX(x)
    activeIndex.current = index
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
      moveTo(index)
    }
  }

  // Release: a held-still long-press just closes the page blur (no
  // navigation — a "peek", not a selection); a tap or a drag-to-another-tab
  // both navigate to wherever the pill ended up, with the same 1s glassy
  // hold before fading.
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
    const baseWidth = barWidth > 0 ? barWidth / Math.max(visibleRoutes.length, 1) - PILL_MARGIN * 2 : width
    const stretchRatio = baseWidth > 0 ? width / baseWidth : 1
    const squash = 1 - Math.min(Math.max(stretchRatio - 1, 0), 0.4) * 0.25
    return CONTENT_HEIGHT * 0.7 * squash
  })

  const pillTop = useDerivedValue(() => (CONTENT_HEIGHT - pillHeight.value) / 2)

  // No refraction here (that's the native shader's job) — just blur + a
  // translucent fill whose opacity tracks `rimIntensity`, plus a bright
  // rim border, same "glass overlay on top of whatever's behind it" idea.
  // Purple-tinted (brand accent #8B5CF6/#A855F7), not plain white — matches
  // the native version and the rest of the app's purple CTA color.
  const pillStyle = useAnimatedStyle(() => ({
    left: leftEdge.value,
    top: pillTop.value,
    width: rightEdge.value - leftEdge.value,
    height: pillHeight.value,
    borderRadius: pillHeight.value / 2,
    backgroundColor: `rgba(139,92,246,${0.1 + rimIntensity.value * 0.28})`,
    borderWidth: 1,
    borderColor: 'rgba(168,85,247,0.7)',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    backdropFilter: `blur(${blurAmount.value}px)` as any,
  }))

  return (
    // Floating island, restored to the exact original placement (see
    // driver-app's untouched `_layout.tsx`) — not full-width/docked.
    <View style={{ position: 'absolute', left: BAR_SIDE_MARGIN, right: BAR_SIDE_MARGIN, bottom: BAR_BOTTOM_MARGIN }}>
      <View style={[{ borderRadius: BAR_RADIUS }, getBarShadow()]}>
        <View
          style={{ height: CONTENT_HEIGHT, borderRadius: BAR_RADIUS, overflow: 'hidden' }}
          onLayout={e => setBarWidth(e.nativeEvent.layout.width)}
        >
          {/* Real frosted background, the exact GlassMaterial recipe
              (BlurView + a top-bright/bottom-dim wash + a brighter top
              border) — not GlassMaterial itself, since its children slot
              forces `alignItems/justifyContent: center`, which would
              shrink-wrap and center the tab row instead of letting it
              stretch full-width. Same visual result, just laid out by
              this component instead of delegated to it. */}
          <BlurView tint={isLight ? 'light' : 'dark'} intensity={60} style={StyleSheet.absoluteFill} />
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
                borderWidth: 1,
                borderColor: isLight ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.1)',
                borderTopWidth: 1.5,
                borderTopColor: isLight ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.2)',
              },
            ]}
            pointerEvents="none"
          />

          <Animated.View style={[styles.pill, pillStyle]} pointerEvents="none" />

          <GestureDetector gesture={panGesture}>
            <View style={[styles.row, { height: CONTENT_HEIGHT }]}>
              {visibleRoutes.map((route, index) => {
                const { options } = descriptors[route.key]
                const isFocused = selectedIndex === index
                const label = options.title ?? route.name
                const tintColor = isFocused
                  ? (options.tabBarActiveTintColor ?? '#8B5CF6')
                  : (options.tabBarInactiveTintColor ?? '#888888')
                const icon = options.tabBarIcon?.({ focused: isFocused, color: tintColor, size: 24 })

                return (
                  <View key={route.key} style={styles.tab} onLayout={onTabLayout(index)}>
                    {icon}
                    <Text style={[styles.label, { color: tintColor }, isFocused && styles.labelActive]}>{label}</Text>
                  </View>
                )
              })}
            </View>
          </GestureDetector>
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
  },
  label: {
    fontSize: 12,
    marginTop: 2,
  },
  labelActive: {
    fontWeight: '600',
  },
})
