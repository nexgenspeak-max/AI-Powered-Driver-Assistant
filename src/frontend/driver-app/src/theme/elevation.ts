// Shared elevation scale — the single source of truth for every "floating"
// surface's shadow across driver-app and customer-app.
//
// Uses the modern `boxShadow` style string (React Native 0.76+, on by default
// under the New Architecture that Expo SDK 54 ships) instead of the legacy
// `shadowColor`/`shadowOffset`/`shadowRadius` + `elevation` combo. The legacy
// props rendered as a hard, flat grey outline on real Android devices (see the
// disabled-shadow notes in GlassSurface.tsx / DashboardModeSwitch.tsx that this
// replaces) — `boxShadow` renders the same soft blur on iOS, Android and web.
//
// NOT a real cross-app shared module: customer-app and driver-app are two
// independent Expo projects with no workspace linking, so this file is
// duplicated byte-for-byte at `src/theme/elevation.ts` in both apps — copy any
// edit to both copies.
//
// Two ramps because a near-black dark screen gives a shadow almost nothing to
// fade into: dark mode needs a deeper, higher-opacity shadow to read as depth
// at all. `getElevation(level, isLight)` picks the right ramp; callers that
// already know they only render in one theme can import the object directly.

type ShadowStyle = { boxShadow: string }

export const elevation = {
  // Resting cards, list rows, segmented controls.
  sm: {
    boxShadow:
      '0px 1px 3px rgba(17,12,32,0.10), 0px 1px 2px rgba(17,12,32,0.06)',
  },
  // Standard content card / Surface — the default for anything on a screen.
  md: {
    boxShadow:
      '0px 6px 16px rgba(17,12,32,0.12), 0px 2px 6px rgba(17,12,32,0.08)',
  },
  // Floating glass panels: tab bar, map overlays, banners, bottom sheets.
  lg: {
    boxShadow:
      '0px 16px 40px rgba(17,12,32,0.18), 0px 6px 14px rgba(17,12,32,0.10)',
  },
} as const satisfies Record<'sm' | 'md' | 'lg', ShadowStyle>

export const elevationDark = {
  sm: {
    boxShadow: '0px 1px 3px rgba(0,0,0,0.40), 0px 1px 2px rgba(0,0,0,0.28)',
  },
  md: {
    boxShadow: '0px 8px 20px rgba(0,0,0,0.46), 0px 3px 8px rgba(0,0,0,0.34)',
  },
  lg: {
    boxShadow: '0px 20px 48px rgba(0,0,0,0.55), 0px 8px 18px rgba(0,0,0,0.40)',
  },
} as const satisfies Record<'sm' | 'md' | 'lg', ShadowStyle>

export type ElevationLevel = keyof typeof elevation

export function getElevation(
  level: ElevationLevel,
  isLight: boolean,
): ShadowStyle {
  return isLight ? elevation[level] : elevationDark[level]
}
