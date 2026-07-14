import { View, Text } from 'react-native'
import { ABOUT_TITLE, ABOUT_PARAGRAPHS } from '../data/faqData'

export function AboutContent() {
  return (
    <View>
      <Text className="text-xl font-extrabold text-gray-900 mb-3">{ABOUT_TITLE}</Text>
      {ABOUT_PARAGRAPHS.map((paragraph, i) => (
        <Text key={i} className="text-gray-500 leading-6 mb-3">{paragraph}</Text>
      ))}
    </View>
  )
}
