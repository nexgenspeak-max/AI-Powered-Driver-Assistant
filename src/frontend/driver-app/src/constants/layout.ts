import { BUTTON_RISE, BUTTON_LABEL_OVERHANG } from '../components/AssistantTabButton'

// Top-anchored map overlays (e.g. NavigationHud). Chat opens from the tab-bar
// orb only (no floating FAB) — keep a modest gap under the status bar.
// Add to `insets.top`.
export const TOP_OVERLAY_CLEARANCE = 12
/** @deprecated Use TOP_OVERLAY_CLEARANCE — chat FAB removed. */
export const TOP_CLEARANCE_BELOW_CHAT_BUTTON = TOP_OVERLAY_CLEARANCE

// LiquidGlassTabBar.tsx is a "floating island" that renders ON TOP of screen
// content instead of reserving layout space for itself — anything
// bottom-anchored in a tab screen has to clear its whole footprint itself,
// or it gets visually buried under (or, worse, behind/under) the raised
// center "Trợ lý" button, which pokes up an extra `BUTTON_RISE` above the
// bar's own top edge — the actual tallest point of the bar's silhouette.
// Add to `insets.bottom`.
//
// 84 is the web tab bar's own content height (LiquidGlassTabBar.web.tsx's
// CONTENT_HEIGHT) — taller than native's 72, used here as the safe upper
// bound since this one constant covers both platforms. `BUTTON_RISE` is
// imported (not copied) so this stays correct if the button's rise is ever
// retuned.
export const MAP_OVERLAY_BOTTOM_CLEARANCE = 16 + 84 + BUTTON_RISE + 12

// Scrollable tab screens must clear the floating tab bar plus the raised
// assistant button (disc + label pill below).
export const SCROLL_TAB_BAR_CLEARANCE = MAP_OVERLAY_BOTTOM_CLEARANCE + BUTTON_LABEL_OVERHANG
