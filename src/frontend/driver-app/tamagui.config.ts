import { createTamagui } from 'tamagui'
import { config as configV3 } from '@tamagui/config/v3'

// Brand tokens — identical in light & dark, shared across driver-app and
// customer-app. Primary accent is purple (#7C5B9C → #A855F7 gradient) per the
// AI-app reference design; `dark`/`accent` carry the near-black identity used
// for dark-theme surfaces, gradients and chat bubbles.
const brand = {
  primary: '#7C5B9C',
  primaryPress: '#63447d',
  primaryMuted: 'rgba(124,91,156,0.16)',
  gradientEnd: '#A855F7',
  dark: '#0B0B0F',
  accent: '#1C1C26',
  accentLight: '#c3aee0',
  textInverse: '#ffffff',
}

// Theme-dependent semantic tokens — these swap automatically with the active
// Tamagui <Theme name="light"|"dark"> wrapper (see app/_layout.tsx + themeStore).
const light = {
  ...brand,
  surface: '#f4f6fb',
  surfaceElevated: '#ffffff',
  border: '#e5e7eb',
  borderStrong: '#d1d5db',
  textPrimary: '#111827',
  textSecondary: '#6b7280',
  textMuted: '#9ca3af',
  success: '#16a34a',
  danger: '#ef4444',
  warning: '#f59e0b',
  info: '#3b82f6',
}

const dark = {
  ...brand,
  surface: '#0B0B0F',
  surfaceElevated: '#15151C',
  surfaceHigh: '#1C1C26',
  border: 'rgba(255,255,255,0.08)',
  borderStrong: 'rgba(255,255,255,0.16)',
  textPrimary: '#F6F4FA',
  textSecondary: '#B7B2C5',
  textMuted: '#726d82',
  success: '#34d399',
  danger: '#f87171',
  warning: '#fbbf24',
  info: '#60a5fa',
}

const tamaguiConfig = createTamagui({
  ...configV3,
  tokens: {
    ...configV3.tokens,
    // Static fallback (used only outside a <Theme> context) — dark values
    // since that's the app's default theme.
    color: { ...configV3.tokens.color, ...dark },
    radius: { ...configV3.tokens.radius, card: 24, control: 12, pill: 999, bubble: 22 },
  },
  themes: {
    ...configV3.themes,
    light: { ...configV3.themes.light, ...light, surfaceHigh: light.surfaceElevated },
    dark: { ...configV3.themes.dark, ...dark },
  },
})

export type Conf = typeof tamaguiConfig
declare module 'tamagui' {
  interface TamaguiCustomConfig extends Conf {}
}
export default tamaguiConfig
