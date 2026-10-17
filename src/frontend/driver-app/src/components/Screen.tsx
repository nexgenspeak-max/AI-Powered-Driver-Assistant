import type { ReactNode } from 'react'
import { RefreshControl, ScrollView, type StyleProp, type ViewStyle } from 'react-native'
import { View } from 'tamagui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { AppBar } from './AppBar'
import { BackButton, getBackButtonClearance } from './BackButton'
import { SCROLL_TAB_BAR_CLEARANCE } from '../constants/layout'

// Standard screen shell. Replaces the per-screen mix of bare `<View flex={1}>`,
// hardcoded background hex, one-off ScrollView padding, and mismatched tab-bar
// clearance (100 vs 104). Every screen: flat `$background`, safe-area aware.

export type ScreenProps = {
  children: ReactNode
  /** Wrap content in a ScrollView with standard padding + tab-bar clearance. */
  scroll?: boolean
  /** Apply the standard 20px gutter + top inset + gap. On by default. */
  padded?: boolean
  /** Safe-area edges to inset. Default: just the top (tab bar covers bottom). */
  edges?: Array<'top' | 'bottom'>
  /** Pull-to-refresh (scroll only). */
  refreshing?: boolean
  onRefresh?: () => void
  /** Fixed element above the scroll area — an AppBar or a sticky dashboard header. */
  header?: ReactNode
  /** Render floating BackButton and reserve top clearance for it. */
  backButton?: boolean
  /** Detail-screen title: renders a standard AppBar (with back) as the header.
   *  Preferred over `backButton` + an in-content h1 for pushed screens. */
  title?: string
  /** Where the back button navigates — defaults to '/profile'. */
  backTo?: Parameters<typeof router.replace>[0]
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
  backButton = false,
  backTo,
  title,
  background = '$background',
  contentContainerStyle,
  style,
}: ScreenProps) {
  const insets = useSafeAreaInsets()
  if (title && !header) {
    // Hidden-tab routes have no push history, so back must be an explicit
    // replace (see AppBar.tsx / BackButton.tsx).
    header = <AppBar title={title} onBack={() => router.replace(backTo ?? '/profile')} />
  }
  const top = edges.includes('top') ? insets.top : 0
  const bottom = edges.includes('bottom') ? insets.bottom : 0

  const topPad = backButton
    ? getBackButtonClearance(insets.top) + 16
    : header
      ? 16
      : top + 16

  // The Navigation Bar is edge-attached and paints over the bottom safe area,
  // so scroll content clears `insets.bottom` + the bar/orb footprint always
  // (independent of the `edges` prop, which only governs the top inset here).
  const contentPad: ViewStyle = padded
    ? {
        paddingHorizontal: 20,
        paddingTop: topPad,
        paddingBottom: insets.bottom + SCROLL_TAB_BAR_CLEARANCE,
        gap: 20,
      }
    : { paddingTop: backButton ? getBackButtonClearance(insets.top) : header ? 0 : top, paddingBottom: bottom }

  return (
    <View flex={1} backgroundColor={background} style={style}>
      {backButton ? <BackButton to={backTo} /> : null}
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
