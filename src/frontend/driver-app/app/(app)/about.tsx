import { ScrollView } from 'react-native'
import { AboutContent } from '../../src/features/info/components/AboutContent'

export default function AboutScreen() {
  return (
    <ScrollView className="flex-1 bg-surface" contentContainerClassName="p-5 pt-16">
      <AboutContent />
    </ScrollView>
  )
}
