import { ScrollView } from 'react-native'
import { View, Text } from 'tamagui'
import { BackButton } from '../../src/components/BackButton'
import { FaqContent } from '../../src/features/info/components/FaqContent'

export default function FaqScreen() {
  return (
    <View flex={1} backgroundColor="$surface">
      <BackButton />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingTop: 112, paddingBottom: 100, gap: 16 }}>
        <Text fontSize="$6" fontWeight="800" color="$textPrimary">
          Câu hỏi thường gặp
        </Text>
        <FaqContent />
      </ScrollView>
    </View>
  )
}
