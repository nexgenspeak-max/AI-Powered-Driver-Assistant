import { YStack, Text } from 'tamagui'
import { ABOUT_TITLE, ABOUT_PARAGRAPHS } from '../data/faqData'

export function AboutContent() {
  return (
    <YStack>
      <Text fontSize="$6" fontWeight="800" color="$textPrimary" marginBottom="$3">
        {ABOUT_TITLE}
      </Text>
      {ABOUT_PARAGRAPHS.map((paragraph, i) => (
        <Text key={i} color="$textSecondary" lineHeight={24} marginBottom="$3">
          {paragraph}
        </Text>
      ))}
    </YStack>
  )
}
