import { BUTTON_RISE } from '../components/assistantTabButtonShared'

// Top-anchored map overlays (e.g. NavigationHud). Chat opens from the nav-bar
// orb only (no floating FAB) — keep a modest gap under the status bar.
// Add to `insets.top`.
export const TOP_OVERLAY_CLEARANCE = 12
/** @deprecated Use TOP_OVERLAY_CLEARANCE — chat FAB removed. */
export const TOP_CLEARANCE_BELOW_CHAT_BUTTON = TOP_OVERLAY_CLEARANCE

// The M3 Navigation Bar's own content height (excludes the bottom safe-area
// inset it also paints over). Keep in sync with NavigationBar.tsx.
export const NAV_BAR_HEIGHT = 80

// NavigationBar.tsx is edge-attached and paints over the bottom safe-area
// inset, but it still renders ON TOP of screen content (a `tabBar` render
// prop reserves no layout space). Anything bottom-anchored in a tab screen
// has to clear its whole footprint itself: the bar height, plus the docked
// "Trợ lý" orb, which pokes up an extra `BUTTON_RISE` above the bar's top
// edge — the actual tallest point of the silhouette. `BUTTON_RISE` is
// imported (not copied) so this stays correct if the rise is ever retuned.
// Add to `insets.bottom`.
export const MAP_OVERLAY_BOTTOM_CLEARANCE = NAV_BAR_HEIGHT + BUTTON_RISE + 12

// Scrollable tab screens must clear the nav bar plus the raised orb.
// Consumers add `insets.bottom` on top (the bar covers the safe area).
export const SCROLL_TAB_BAR_CLEARANCE = NAV_BAR_HEIGHT + BUTTON_RISE + 8
