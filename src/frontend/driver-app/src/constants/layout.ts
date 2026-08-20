import { CHAT_TOGGLE_BUTTON_SIZE } from '../features/home/components/ChatToggleButton'

// ChatToggleButton (Home screen only) sits at `insets.top + 12`, is
// CHAT_TOGGLE_BUTTON_SIZE tall — anything else top-anchored on that same
// screen needs to clear its whole footprint plus a gap, not just butt up
// against it. Add to `insets.top`.
export const TOP_CLEARANCE_BELOW_CHAT_BUTTON = 12 + CHAT_TOGGLE_BUTTON_SIZE + 12

// LiquidGlassTabBar.tsx is a "floating island" that renders ON TOP of screen
// content instead of reserving layout space for itself (bottom: 16, content
// height 76 — see that file's own comment on why) — anything bottom-anchored
// in a tab screen has to clear that whole footprint itself, or it gets
// visually buried under the tab bar. Add to `insets.bottom`.
//
// Named distinctly from GlobalAssistantOrb.tsx's own local (unexported)
// `TAB_BAR_CLEARANCE = 120` — that one is a looser drag-bound buffer for a
// freely-draggable bubble, tuned independently for that purpose; this one is
// the precise tab-bar footprint used to sit map overlay cards flush just
// above it. Same underlying concern, deliberately different constants — the
// distinct name is so a future "these should obviously be the same value"
// cleanup doesn't quietly break either one's tuning.
export const MAP_OVERLAY_BOTTOM_CLEARANCE = 16 + 76 + 12
