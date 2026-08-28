import { CHAT_TOGGLE_BUTTON_SIZE } from '../features/home/components/ChatToggleButton'
import { BUTTON_RISE } from '../components/AssistantTabButton'

// ChatToggleButton (Home screen only) sits at `insets.top + 12`, is
// CHAT_TOGGLE_BUTTON_SIZE tall — anything else top-anchored on that same
// screen needs to clear its whole footprint plus a gap, not just butt up
// against it. Add to `insets.top`.
export const TOP_CLEARANCE_BELOW_CHAT_BUTTON = 12 + CHAT_TOGGLE_BUTTON_SIZE + 12

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
// retuned. Reported bug this fixes: OptimizedRoutePanel (the "N điểm dừng"
// stop list) sat low enough that the AI button's own poked-up top clipped
// into/behind its bottom edge.
export const MAP_OVERLAY_BOTTOM_CLEARANCE = 16 + 84 + BUTTON_RISE + 12
