import { ScrollView } from 'react-native'
import { View } from 'tamagui'
import { BackButton } from '../../src/components/BackButton'
import { AboutContent } from '../../src/features/info/components/AboutContent'

export default function AboutScreen() {
  return (
    <View flex={1} backgroundColor="$surface">
      <BackButton />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingTop: 112, paddingBottom: 100 }}>
        <AboutContent />
      </ScrollView>
    </View>
  )
}
