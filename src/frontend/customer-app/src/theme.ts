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
  // Was a one-off blue (#6c8aff) — the only accent in either app that wasn't
  // the brand violet. Now the shared `$primary` value (#8B5CF6): ~4.8:1 on the
  // dark card, ~3.5:1 on the near-white card (links here render 600-weight).
  linkColor: '#8B5CF6',

  card: {
    // Light-mode fill bumped from 0.7 -> 0.94 opacity — at 0.7 the card
    // barely differs from the near-white screen bg (`screenBackground.light`
    // = #F5F4F8) behind it, so its edge only read via the shadow's blur
    // instead of the fill itself, making the card look like a soft, uneven
    // halo instead of one solid block wrapping every field.
    background: { dark: '#2A2438', light: 'rgba(255,255,255,0.94)' },
    maxWidth: 384,
    shadow: {
      color: '#000000',
      offsetY: { dark: 16, light: 10 },
      // Light-mode radius/opacity/elevation pulled way down (30/0.3/14 ->
      // 14/0.14/6) — that combo painted a large, soft halo around the card
      // (worse on Android, where `elevation` isn't clipped by the card's own
      // `overflow: hidden`) that read as a blurry, ill-defined border rather
      // than a crisp edge. Dark mode is untouched — same halo isn't visible
      // against its own near-black screen bg.
      opacity: { dark: 0.55, light: 0.14 },
      radius: { dark: 28, light: 14 },
      elevation: { dark: 12, light: 6 },
    },
  },

  field: {
    radius: 16,
    background: { dark: 'rgba(255,255,255,0.05)', light: 'rgba(255,255,255,0.55)' },
    // Dark mode keeps the customer-app booking form's shader rim value
    // (THEME_PARAMS.ringColor [1,1,1,0.05]) — a near-invisible white line
    // still reads against the dark card. Light mode's old match ([1,1,1,0.7],
    // i.e. near-opaque white) was invisible here instead: an almost-white
    // line on top of this field's own near-white fill and the near-white
    // card behind it. Swapped for the app's actual `$border` gray token
    // (tamagui.config.ts) so the field outline is visible on light mode.
    ring: { dark: 'rgba(255,255,255,0.05)', light: '#D1D5DB' },
    // Outer shadow only — no inner concave shadow (unlike GlassBookingInput's
    // shader, which still carves a top lip in dark mode; on this screen's
    // much darker card that would read as mud, not glass).
    // Shadow color is black in both themes now — light mode used to be a
    // purple (#8B5CF6) tint, the only glass surface in the app whose shadow
    // didn't match the neutral black every other one uses (card.shadow above,
    // GlassSurface, GlassMaterial, the tab bar). Not the same thing as the
    // purple CTA buttons' shadow (GlassButton/Button primary) — those
    // deliberately match their own gradient fill, a different, separately
    // documented exception; this field has no colored fill to match.
    shadow: {
      color: { dark: '#000000', light: '#000000' },
      offsetY: { dark: 4, light: 6 },
      opacity: { dark: 0.3, light: 0.16 },
      radius: { dark: 10, light: 16 },
      elevation: 3,
    },
  },

  cta: {
    // Same pair as the shared CTA_GRADIENT (src/components/LiquidGlass) so the
    // auth "Sign in" button matches every other primary button in the app.
    gradient: ['#7C3AED', '#A855F7'] as [string, string],
  },
} as const
