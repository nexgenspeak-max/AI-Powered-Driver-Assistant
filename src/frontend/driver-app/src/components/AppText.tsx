import { Text, type TextProps } from 'tamagui'

// One type scale for the whole app. Every screen was hand-picking `fontSize`
// (`$5`, `16`, `"$6" fontWeight="800"`…) so the same role — a screen title, a
// row label — rendered at a different size on each screen. `AppText` replaces
// those ad-hoc values with 8 named roles.
//
// The weight is carried by the Inter face name (`Inter_700Bold` etc.), NOT by a
// `fontWeight` prop — setting both makes Android synthesize a faux-bold on top
// of the already-bold face. So `AppText` never sets `fontWeight`; pick the
// variant whose weight you want.
//
// Duplicated in customer-app/src/components/AppText.tsx — the two apps are
// separate services and may diverge, but start identical.

export type TextVariant =
  | 'display' // big numbers / hero figures
  | 'h1' // screen title
  | 'h2' // section / card title
  | 'title' // list-row title, emphasised body
  | 'body' // default paragraph / value text
  | 'bodyStrong' // body weight-bumped for emphasis inside a paragraph
  | 'label' // field labels, meta rows, badges
  | 'caption' // smallest — timestamps, helper text, footnotes

type Spec = {
  fontSize: number
  lineHeight: number
  fontFamily: string
  letterSpacing?: number
}

const VARIANTS: Record<TextVariant, Spec> = {
  display: { fontSize: 28, lineHeight: 34, fontFamily: 'Inter_700Bold', letterSpacing: -0.3 },
  h1: { fontSize: 22, lineHeight: 28, fontFamily: 'Inter_700Bold', letterSpacing: -0.2 },
  h2: { fontSize: 18, lineHeight: 24, fontFamily: 'Inter_600SemiBold' },
  title: { fontSize: 16, lineHeight: 22, fontFamily: 'Inter_600SemiBold' },
  body: { fontSize: 15, lineHeight: 22, fontFamily: 'Inter_400Regular' },
  bodyStrong: { fontSize: 15, lineHeight: 22, fontFamily: 'Inter_600SemiBold' },
  label: { fontSize: 13, lineHeight: 18, fontFamily: 'Inter_500Medium' },
  caption: { fontSize: 12, lineHeight: 16, fontFamily: 'Inter_400Regular' },
}

export type AppTextProps = Omit<TextProps, 'fontFamily' | 'fontWeight'> & {
  variant?: TextVariant
}

export function AppText({ variant = 'body', style, ...rest }: AppTextProps) {
  const v = VARIANTS[variant]
  return (
    <Text
      color="$textPrimary"
      fontSize={v.fontSize}
      lineHeight={v.lineHeight}
      letterSpacing={v.letterSpacing}
      // Caller props win over the variant defaults (color, textAlign,
      // numberOfLines, an explicit fontSize bump…) — except the font family,
      // forced last via `style` so it can't be half-overridden into a
      // weight/family mismatch.
      {...rest}
      style={[{ fontFamily: v.fontFamily }, style]}
    />
  )
}
