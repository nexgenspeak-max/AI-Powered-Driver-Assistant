import { AppText } from '../../../components/AppText'

export function SectionTitle({ children }: { children: string }) {
  return (
    <AppText
      variant="label"
      color="$textSecondary"
      textTransform="uppercase"
      letterSpacing={0.5}
      paddingHorizontal="$4"
      paddingTop="$4"
      paddingBottom="$2"
    >
      {children}
    </AppText>
  )
}
