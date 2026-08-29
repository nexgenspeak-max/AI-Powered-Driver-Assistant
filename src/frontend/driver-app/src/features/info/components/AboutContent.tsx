import { YStack } from 'tamagui'
import { AppText } from '../../../components/AppText'
import { ABOUT_TITLE, ABOUT_PARAGRAPHS } from '../data/faqData'

export function AboutContent() {
  return (
    <YStack>
      <AppText variant="h1" marginBottom="$3">
        {ABOUT_TITLE}
      </AppText>
      {ABOUT_PARAGRAPHS.map((paragraph, i) => (
        <AppText key={i} variant="body" color="$textSecondary" marginBottom="$3">
          {paragraph}
        </AppText>
      ))}
    </YStack>
  )
}
