// Shared design tokens for the "Welcome back" / "Create account" auth
// screens (Login/Register, both apps) — centralized so customer-app and
// driver-app render byte-identical colors/shadows/radii instead of two
// hand-tuned copies drifting apart over time. Card's `shadowIntensity="strong"`
// variant also reads `card.shadow` below, since that variant exists
// specifically for these screens' need to float a card off a near-black/
// near-white bg with little contrast of its own to lean on.
//
// NOT a real cross-app shared module: customer-app and driver-app are two
// independent Expo projects (separate Metro roots, no workspace package
// linking them), so there is no single file either project can literally
// import from the other's source tree. This file is duplicated byte-for-byte
// at `src/theme.ts` in both apps — copy any edit to both copies, or the
// "single source of truth" intent silently breaks.

export const authGlassTheme = {
  screenBackground: { dark: '#121212', light: '#F5F4F8' },
  titleColor: { dark: '#ffffff', light: '#000000' },
  linkColor: '#6c8aff',

  card: {
    background: { dark: '#2A2438', light: 'rgba(255,255,255,0.7)' },
    maxWidth: 384,
    shadow: {
      color: '#000000',
      offsetY: { dark: 16, light: 18 },
      opacity: { dark: 0.55, light: 0.3 },
      radius: { dark: 28, light: 30 },
      elevation: { dark: 12, light: 14 },
    },
  },

  field: {
    radius: 16,
    background: { dark: 'rgba(255,255,255,0.05)', light: 'rgba(255,255,255,0.55)' },
    // Same "thin bright rim hugging the border" values as the customer-app
    // booking form's GlassBookingInput shader (THEME_PARAMS.ringColor:
    // [1,1,1,0.05] dark / [1,1,1,0.7] light) — drawn here as a plain RN
    // border instead of a shader rim since this field has no Skia canvas,
    // but the same rgba values so both forms' fields read as the same
    // border treatment.
    ring: { dark: 'rgba(255,255,255,0.05)', light: 'rgba(255,255,255,0.7)' },
    // Outer shadow only — no inner concave shadow (unlike GlassBookingInput's
    // shader, which still carves a top lip in dark mode; on this screen's
    // much darker card that would read as mud, not glass).
    shadow: {
      color: { dark: '#000000', light: '#8B5CF6' },
      offsetY: { dark: 4, light: 6 },
      opacity: { dark: 0.3, light: 0.16 },
      radius: { dark: 10, light: 16 },
      elevation: 3,
    },
  },

  cta: {
    gradient: ['#8B5CF6', '#A855F7'] as [string, string],
  },
} as const
