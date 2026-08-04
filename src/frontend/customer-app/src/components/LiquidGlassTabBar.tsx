/**
 * LiquidGlassTabBar.tsx
 * -----------------------------------------------------------------------
 * Custom bottom tab bar mimicking the newer Telegram app's two press
 * behaviors, ported from a standalone reference file into a
 * `tabBar={props => ...}` prop for expo-router's `<Tabs>` — `BottomTabBarProps`
 * (state/descriptors/navigation/insets) in, so it plugs straight into the
 * existing `_layout.tsx` navigator instead of needing its own screen router.
 *
 *  A) SHORT TAP (touch down, release right away):
 *     - A glass pill (blur + bright rim) appears immediately at the pressed tab.
 *     - After release, the pill stays "glassy" for ~1000ms before fading out
 *       (withDelay + withTiming) — not an instant snap-off.
 *
 *  B) LONG PRESS, held still (> ~350ms):
 *     - Instead of just the pill, the ENTIRE page content above the tab bar
 *       blurs (a full-screen BackdropBlur) — a "peek" gesture. Releasing
 *       fades the page blur back out quickly (no 1s hold, unlike the tap
 *       case, since this is a distinct held interaction, not a tap).
 *
 *  C) PRESS-AND-DRAG across tabs (moves > ~10px before the 350ms hold fires):
 *     - Cancels the pending long-press/page-blur — a drag is not a hold.
 *     - The glass pill follows the finger live, snapping to whichever tab's
 *       column it's currently over (reuses the same spring-driven `moveTo`
 *       tap already used for the tap case).
 *     - Releasing navigates to whichever tab the finger ended up over —
 *       like iOS's drag-across-the-dock or a Control Center slider, not a
 *       release-only tap.
 *
 * All three are variations on one continuous touch (down → maybe-move →
 * up), so they're driven by a single `Gesture.Pan()` over the whole row
 * instead of one `Pressable` per tab — a `Pressable` has no way to keep
 * tracking the finger once it moves past that tab's own bounds, which a
 * per-tab implementation would need to detect the drag case at all.
 *
 * The reference file's bar had NO background at all (fully transparent —
 * only the moving pill had any fill), which read as broken/washed-out once
 * wired in here — icons with no opaque surface behind them blend into
 * whatever's scrolling underneath. This version paints a real frosted
 * background instead (BlurView + gradient wash), sized/positioned/shadowed
 * to be pixel-identical to this app's *original* tab bar (GlassTabButton +
 * GlassMaterial, still intact in driver-app's `_layout.tsx` — same
 * floating island: `position:absolute, left:20, right:20, bottom:16,
 * borderRadius:30`) — only the individual buttons' press behavior is new
 * (the tap-pill / hold-to-blur-the-page from the reference file), not the
 * bar's own placement or shape.
 *
 * Three parts, same split as the reference:
 *   1. LiquidGlassProvider — context holding one shared value `pageBlur`,
 *      read by PageBlurOverlay and written by the tab bar.
 *   2. PageBlurOverlay     — wrap around each screen's content (via `<Tabs
 *      screenLayout>`, not around the tab bar) — fades in/out with `pageBlur`.
 *   3. LiquidGlassTabBar   — the tab bar itself; consumes `BottomTabBarProps`
 *      directly so every existing `Tabs.Screen`'s `tabBarIcon`/`title` keeps
 *      working unchanged.
 *
 * Requires: @shopify/react-native-skia, react-native-reanimated, expo-blur,
 * expo-linear-gradient (all already dependencies of this app).
 */

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'
import { LayoutChangeEvent, StyleSheet, Text, View } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import { BlurView } from 'expo-blur'
import { LinearGradient } from 'expo-linear-gradient'
import { useThemeName } from 'tamagui'
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs'
import {
  BackdropBlur,
  BackdropFilter,
  Blur,
  Canvas,
  Fill,
  Group,
  RoundedRect,
  RuntimeShader,
  Skia,
} from '@shopify/react-native-skia'
import {
  Easing,
  runOnJS,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated'

// =========================================================================
// 1. CONTEXT — shares `pageBlur` between the tab bar and PageBlurOverlay
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
// 2. PAGE BLUR OVERLAY — blurs whatever it wraps while a tab is long-pressed
// =========================================================================
const PAGE_BLUR_MAX = 18

export function PageBlurOverlay({ children }: { children: ReactNode }) {
  const { pageBlur } = useLiquidGlass()

  const overlayOpacity = useDerivedValue(() => Math.min(pageBlur.value / PAGE_BLUR_MAX, 1))

  return (
    <View style={{ flex: 1 }}>
      {children}

      {/* pointerEvents="none" so this never blocks touches — the page just
          visually reads as blurred while a tab is held, content behind the
          glass tint layer still shows through. */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Canvas style={StyleSheet.absoluteFill}>
          <BackdropBlur blur={pageBlur} clip={{ x: 0, y: 0, width: 4000, height: 4000 }}>
            <Fill color="rgba(20,20,30,0.001)" />
          </BackdropBlur>
          <Group opacity={overlayOpacity}>
            <Fill color="rgba(255,255,255,0.08)" />
          </Group>
        </Canvas>
      </View>
    </View>
  )
}

// =========================================================================
// 3. REFRACTION SHADER for the pill
// =========================================================================
const source = Skia.RuntimeEffect.Make(`
  uniform shader image;
  uniform float2 rectPos;
  uniform float2 rectSize;
  uniform float  cornerRadius;
  uniform float  refractionStrength;
  uniform float  rimIntensity;
  uniform float2 lightDir;

  float sdRoundedBox(float2 p, float2 b, float r) {
    float2 q = abs(p) - b + r;
    return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r;
  }

  half4 main(float2 xy) {
    float2 center   = rectPos + rectSize * 0.5;
    float2 halfSize = rectSize * 0.5 - cornerRadius;
    float2 p = xy - center;

    float dist = sdRoundedBox(p, halfSize, cornerRadius);

    float eps = 1.0;
    float dx = sdRoundedBox(p + float2(eps, 0.0), halfSize, cornerRadius)
             - sdRoundedBox(p - float2(eps, 0.0), halfSize, cornerRadius);
    float dy = sdRoundedBox(p + float2(0.0, eps), halfSize, cornerRadius)
             - sdRoundedBox(p - float2(0.0, eps), halfSize, cornerRadius);
    float2 normal = normalize(float2(dx, dy) + 1e-5);

    float edgeFactor = smoothstep(-28.0, 0.0, dist);
    float2 offset = normal * edgeFactor * refractionStrength;

    half4 color = image.eval(xy + offset);

    float rim = (1.0 - smoothstep(-6.0, 0.0, dist))
              *  smoothstep(-40.0, -6.0, dist);
    float facing = dot(normal, lightDir) * 0.5 + 0.5;
    float highlight = rim * facing * rimIntensity;

    color.rgb += highlight;
    color.rgb = mix(color.rgb, half3(1.0), 0.04 * rimIntensity);
    return color;
  }
`)!

// =========================================================================
// 4. CONFIG
// =========================================================================
// Matches the original GlassTabButton+GlassMaterial floating-island bar
// exactly (see driver-app's app/(app)/_layout.tsx, untouched) — same
// height/radius/margins/shadow, so restyling this away and back didn't
// leave the placement/shape any different from before this experiment.
const CONTENT_HEIGHT = 76
const BAR_RADIUS = 30
const BAR_SIDE_MARGIN = 20
// 32, not the original 16 — on gesture-nav Android, the bottom ~16-24dp of
// the screen is a swipe-up-to-home hot zone that apps can NEVER exclude
// (unlike the left/right back-gesture zone, see withGestureExclusion.js).
// At 16dp the bar's own buttons sat inside that zone, so taps there were
// read as "swipe home" instead of a press — reproduced on a Honor device via
// adb logcat (SwipeUpResponseDetector engaging on this app's package right
// before it got backgrounded and killed). Keep in sync with
// barBottomMarginPx in plugins/withGestureExclusion.js.
const BAR_BOTTOM_MARGIN = 32
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

  // expo-router marks a hidden `Tabs.Screen` (e.g. `href: null` — About/FAQ/
  // the profile sub-screens) via `tabBarItemStyle: { display: 'none' }`
  // rather than removing it from `state.routes` — same filter the default
  // tab bar uses internally, so hidden routes stay hidden here too.
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

  const uniforms = useDerivedValue(() => ({
    rectPos: [leftEdge.value, pillTop.value],
    rectSize: [rightEdge.value - leftEdge.value, pillHeight.value],
    cornerRadius: pillHeight.value / 2,
    refractionStrength: 6,
    rimIntensity: rimIntensity.value,
    lightDir: [-0.5, -1.0],
  }))

  const clipRect = useDerivedValue(() => ({
    x: leftEdge.value,
    y: pillTop.value,
    width: rightEdge.value - leftEdge.value,
    height: pillHeight.value,
  }))
  // `RoundedRect`'s own `rect` prop wants a full `InputRRect` (a nested
  // `{ rect, rx, ry }` Skia RRect), not a flat `{x,y,width,height}` — pass
  // the flattened x/y/width/height/r props instead, which is the OTHER
  // shape it accepts (`RRectCtor`). `clipRect` above stays flat since
  // `BackdropFilter`'s `clip` prop takes that shape directly.
  const pillWidth = useDerivedValue(() => rightEdge.value - leftEdge.value)
  const rrCornerRadius = useDerivedValue(() => pillHeight.value / 2)

  // Purple-tinted glass pill (brand accent, #8B5CF6) — was plain white,
  // which read as a generic/blue-ish Telegram-style highlight instead of
  // matching this app's purple CTA color everywhere else.
  const pillFillColor = useDerivedValue(() => {
    const t = rimIntensity.value
    const alpha = 0.1 + t * 0.28
    return `rgba(139,92,246,${alpha})`
  })

  const blurDV = useDerivedValue(() => blurAmount.value)

  return (
    // Floating island, restored to the exact original placement (see
    // driver-app's untouched `_layout.tsx`: `position:absolute, left:20,
    // right:20, bottom:16, borderRadius:30`) — not full-width/docked. RN
    // Navigation's custom `tabBar` never reserves layout space for it
    // automatically (no screen here calls `useBottomTabBarHeight()`), so
    // this floats over screen content exactly like the original did.
    <View style={{ position: 'absolute', left: BAR_SIDE_MARGIN, right: BAR_SIDE_MARGIN, bottom: BAR_BOTTOM_MARGIN }}>
      {/* Shadow lives on this outer plain View — RN clips a view's own
          shadow when that same view also sets `overflow: hidden` (needed
          below to clip the blur/gradient/canvas to the rounded corners),
          same outer-shadow/inner-clip split as GlassMaterial. */}
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

          <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
            <BackdropFilter
              clip={clipRect}
              filter={
                <RuntimeShader source={source} uniforms={uniforms}>
                  <Blur blur={blurDV} />
                </RuntimeShader>
              }
            >
              <RoundedRect
                x={leftEdge}
                y={pillTop}
                width={pillWidth}
                height={pillHeight}
                r={rrCornerRadius}
                color={pillFillColor}
              />
            </BackdropFilter>

            <Group>
              <RoundedRect
                x={leftEdge}
                y={pillTop}
                width={pillWidth}
                height={pillHeight}
                r={rrCornerRadius}
                style="stroke"
                strokeWidth={1}
                color="rgba(168,85,247,0.7)"
              />
            </Group>
          </Canvas>

          {/* Every tab gets an equal `flex: 1` column (so N tabs always
              split the bar exactly evenly regardless of icon/label width)
              and fills the full column — `height: '100%'` plus no per-tab
              padding — so the touchable/visual area is the whole cell, not
              a small icon floating in extra dead space. One `GestureDetector`
              over the whole row (not one `Pressable` per tab) is what makes
              the drag-across-tabs gesture possible — see `panGesture` above. */}
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
