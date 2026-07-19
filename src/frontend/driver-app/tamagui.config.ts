import { createTamagui } from 'tamagui'
import { config as configV3 } from '@tamagui/config/v3'

// Brand tokens — identical in light & dark, shared across driver-app and
// customer-app. Layout language borrows "Neo Glass + Soft Dark" (charcoal
// surfaces, no visible borders, soft shadows) but keeps our own purple
// primary/gradient — the accent color itself does NOT change between themes
// (a deliberate, unchanged brand anchor per the design-system spec).
const brand = {
  primary: '#7C5B9C',
  primaryPress: '#63447d',
  primaryMuted: 'rgba(124,91,156,0.16)',
  gradientStart: '#7C5B9C',
  gradientEnd: '#A855F7',
  dark: '#121212',
  accent: '#232325',
  accentLight: '#c3aee0',
  textInverse: '#ffffff',
}

// Full semantic design-system tokens — theme-dependent, adapted (not
// inverted) per surface so cards/containers/overlays stay visually
// distinguishable and WCAG AA-contrasted in both themes. These swap
// automatically with the active Tamagui <Theme name="light"|"dark"> wrapper
// (see app/_layout.tsx + themeStore).
const light = {
  ...brand,
  // Core surfaces
  background: '#f4f6fb',
  surface: '#f4f6fb',
  surfaceElevated: '#ffffff',
  surfaceHigh: '#ffffff',
  surfaceVariant: '#EEE9F3',
  onSurfaceVariant: '#5B5566',
  // Text hierarchy
  textPrimary: '#111827',
  textSecondary: '#6b7280',
  textMuted: '#9ca3af',
  // Borders / dividers — kept faint, definition mostly comes from shadow
  border: '#e5e7eb',
  borderStrong: '#d1d5db',
  outline: '#D9D2E3',
  outlineVariant: '#EDE8F2',
  divider: 'rgba(17,24,39,0.08)',
  // Primary / secondary containers (tonal, not just tints of white)
  primaryContainer: '#F1EBF7',
  onPrimaryContainer: '#4A3563',
  secondary: '#A855F7',
  secondaryContainer: '#F3E8FF',
  onSecondaryContainer: '#5B21B6',
  // Status colors + their containers
  success: '#16a34a',
  successContainer: '#DCFCE7',
  onSuccessContainer: '#14532D',
  warning: '#f59e0b',
  warningContainer: '#FEF3C7',
  onWarningContainer: '#78350F',
  danger: '#ef4444',
  dangerContainer: '#FEE2E2',
  onDangerContainer: '#7F1D1D',
  info: '#3b82f6',
  infoContainer: '#DBEAFE',
  onInfoContainer: '#1E3A8A',
  // Component-specific surfaces
  card: '#ffffff',
  chip: '#EEE9F3',
  chipSelected: '#F1EBF7',
  inputBackground: '#ffffff',
  inputBorder: '#D9D2E3',
  disabledBackground: 'rgba(17,24,39,0.08)',
  disabledText: 'rgba(17,24,39,0.38)',
  // Interaction-state overlays (painted at these opacities over whatever's underneath)
  pressedOverlay: 'rgba(124,91,156,0.12)',
  hoverOverlay: 'rgba(124,91,156,0.08)',
  rippleOverlay: 'rgba(124,91,156,0.16)',
  // Chrome surfaces
  navigationBar: 'rgba(255,255,255,0.7)',
  bottomSheet: '#ffffff',
  dialog: '#ffffff',
  snackbar: '#2D2438',
  onSnackbar: '#ffffff',
}

const dark = {
  ...brand,
  // Lighter than a neutral charcoal, with a purple undertone — gives the
  // frosted-glass tab bar / glass-blob effects real color to diffuse instead
  // of blurring a flat near-black into more flat near-black.
  background: '#1A1420',
  surface: '#1A1420',
  surfaceElevated: '#241D2C',
  surfaceHigh: '#2E2438',
  surfaceVariant: '#2E2438',
  onSurfaceVariant: '#B7B2C0',
  textPrimary: '#F5F5F7',
  textSecondary: '#A1A1A6',
  textMuted: '#6E6E73',
  // "No visible borders" — kept as a near-transparent hairline only where a
  // divider is functionally needed (list rows), definition otherwise comes
  // from soft shadows, not borders.
  border: 'rgba(255,255,255,0.06)',
  borderStrong: 'rgba(255,255,255,0.14)',
  outline: 'rgba(255,255,255,0.16)',
  outlineVariant: 'rgba(255,255,255,0.06)',
  divider: 'rgba(255,255,255,0.06)',
  primaryContainer: '#2D2438',
  onPrimaryContainer: '#E4D9F0',
  secondary: '#C084FC',
  secondaryContainer: '#3B2A52',
  onSecondaryContainer: '#EAD9FB',
  success: '#34d399',
  successContainer: 'rgba(52,211,153,0.16)',
  onSuccessContainer: '#6EE7B7',
  warning: '#fbbf24',
  warningContainer: 'rgba(251,191,36,0.16)',
  onWarningContainer: '#FCD34D',
  danger: '#f87171',
  dangerContainer: 'rgba(248,113,113,0.16)',
  onDangerContainer: '#FCA5A5',
  info: '#60a5fa',
  infoContainer: 'rgba(96,165,250,0.16)',
  onInfoContainer: '#93C5FD',
  card: '#241D2C',
  chip: '#2E2438',
  chipSelected: 'rgba(124,91,156,0.24)',
  inputBackground: '#241D2C',
  inputBorder: 'rgba(255,255,255,0.14)',
  disabledBackground: 'rgba(255,255,255,0.08)',
  disabledText: 'rgba(255,255,255,0.38)',
  pressedOverlay: 'rgba(124,91,156,0.20)',
  hoverOverlay: 'rgba(124,91,156,0.12)',
  rippleOverlay: 'rgba(124,91,156,0.28)',
  // Purple-tinted (not neutral gray) so the blur behind the floating tab bar
  // reads as a lit glass panel rather than plain dark smoked glass.
  navigationBar: 'rgba(90,60,120,0.42)',
  bottomSheet: '#241D2C',
  dialog: '#241D2C',
  snackbar: '#2D2438',
  onSnackbar: '#ffffff',
}

const tamaguiConfig = createTamagui({
  ...configV3,
  tokens: {
    ...configV3.tokens,
    // Static fallback (used only outside a <Theme> context) — dark values
    // since that's the app's default theme.
    color: { ...configV3.tokens.color, ...dark },
    radius: { ...configV3.tokens.radius, card: 24, control: 12, button: 999, pill: 999, bubble: 22, chip: 999 },
    // 4/8pt spacing scale, aliased onto Tamagui's existing $1.."$10 tokens so
    // every screen already using e.g. `padding="$4"` picks this up automatically.
    space: {
      ...configV3.tokens.space,
      1: 4,
      2: 8,
      3: 12,
      4: 16,
      5: 20,
      6: 24,
      7: 28,
      8: 32,
      9: 40,
      10: 48,
    },
  },
  themes: {
    ...configV3.themes,
    light: { ...configV3.themes.light, ...light },
    dark: { ...configV3.themes.dark, ...dark },
  },
})

export type Conf = typeof tamaguiConfig
declare module 'tamagui' {
  interface TamaguiCustomConfig extends Conf {}
}
export default tamaguiConfig
