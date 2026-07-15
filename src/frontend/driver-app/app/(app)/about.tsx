import { View, ScrollView } from 'react-native'
import { BackButton } from '../../src/components/BackButton'
import { AboutContent } from '../../src/features/info/components/AboutContent'

export default function AboutScreen() {
  return (
    <View className="flex-1 bg-surface">
      <BackButton />
      <ScrollView className="flex-1" contentContainerClassName="p-5 pt-28">
        <AboutContent />
      </ScrollView>
    </View>
  )
}
