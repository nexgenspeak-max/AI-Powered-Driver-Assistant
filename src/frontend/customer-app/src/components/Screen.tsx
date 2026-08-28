import type { ReactNode } from 'react'
import { RefreshControl, ScrollView, type StyleProp, type ViewStyle } from 'react-native'
import { View } from 'tamagui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

// Standard screen shell. Replaces the per-screen mix of bare `<View flex={1}>`,
// hardcoded background hex (`#15111F`, `#F4F4F6→#E2E2E6`, `#110D1B`), one-off
// `LinearGradient` fills, and hand-rolled `ScrollView` + `contentContainerStyle`
// padding. Every screen: flat `$background`, safe-area aware, optional scroll.
//
// Duplicated in customer-app/src/components/Screen.tsx.

// LiquidGlassTabBar floats over content (position:absolute, ~76 tall, 16 up) and
// reserves no layout space — scrollable screens pad their content past it.
const TAB_BAR_CLEARANCE = 104

export type ScreenProps = {
  children: ReactNode
  /** Wrap content in a ScrollView with standard padding + tab-bar clearance. */
  scroll?: boolean
  /** Apply the standard 20px gutter + 16px top inset + gap. On by default. */
  padded?: boolean
  /** Safe-area edges to inset. Default: just the top (tab bar covers bottom). */
  edges?: Array<'top' | 'bottom'>
  /** Pull-to-refresh (scroll only). */
  refreshing?: boolean
  onRefresh?: () => void
  /** Fixed element above the scroll area — an AppBar or a sticky dashboard header. */
  header?: ReactNode
  /** Override the screen fill. Defaults to `$background`. */
  background?: string
  contentContainerStyle?: StyleProp<ViewStyle>
  style?: StyleProp<ViewStyle>
}

export function Screen({
  children,
  scroll = false,
  padded = true,
  edges = ['top'],
  refreshing,
  onRefresh,
  header,
  background = '$background',
  contentContainerStyle,
  style,
}: ScreenProps) {
  const insets = useSafeAreaInsets()
  const top = edges.includes('top') ? insets.top : 0
  const bottom = edges.includes('bottom') ? insets.bottom : 0

  const contentPad: ViewStyle = padded
    ? {
        paddingHorizontal: 20,
        paddingTop: (header ? 0 : top) + 16,
        paddingBottom: bottom + TAB_BAR_CLEARANCE,
        gap: 20,
      }
    : { paddingTop: header ? 0 : top, paddingBottom: bottom }

  return (
    <View flex={1} backgroundColor={background} style={style}>
      {header}
      {scroll ? (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[contentPad, contentContainerStyle]}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            onRefresh ? (
              <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} />
            ) : undefined
          }
        >
          {children}
        </ScrollView>
      ) : (
        <View flex={1} style={[contentPad, contentContainerStyle]}>
          {children}
        </View>
      )}
    </View>
  )
}
