import { YStack, Text } from 'tamagui'
import { AppText } from '../../../components/AppText'
import { ABOUT_TITLE, ABOUT_PARAGRAPHS } from '../data/faqData'

export function AboutContent() {
  return (
    <YStack>
      <AppText variant="h1" marginBottom="$3">
        {ABOUT_TITLE}
      </AppText>
      {ABOUT_PARAGRAPHS.map((paragraph, i) => (
        <Text key={i} color="$textSecondary" lineHeight={24} marginBottom="$3">
          {paragraph}
        </Text>
      ))}
    </YStack>
  )
}
