// Full-bleed screen atmospheres — mirrors `assets/icons/{light|dark}/`
// theme-first layout so a theme pass can swap every screen background
// without hunting per-feature folders. Metro needs a static require per file.
//
// On disk (both themes): landing.jpg, dashboard.jpg.
// Only `require` screens that are actually rendered — unused requires still
// ship in the JS bundle.
//
// Landing: light and dark MUST be the same composition (same file). Theme
// difference is the LandingScreen scrim + text colors — not alternate art.
// Both keys require the canonical dark JPG so a drifted light copy cannot
// reappear via a separate require.
//
// Duplicated in driver-app (separate Expo root) — keep both copies in sync.

const LANDING_BG = require('../../assets/layout/dark/landing.jpg')

export const layoutAssets = {
  landing: {
    light: LANDING_BG,
    dark: LANDING_BG,
  },
  // Ready on disk; uncomment + use when a screen mounts this background:
  // dashboard: {
  //   light: require('../../assets/layout/light/dashboard.jpg'),
  //   dark: require('../../assets/layout/dark/dashboard.jpg'),
  // },
} as const

export type LayoutScreen = keyof typeof layoutAssets

export function layoutBackground(screen: LayoutScreen, mode: 'light' | 'dark') {
  return layoutAssets[screen][mode]
}
