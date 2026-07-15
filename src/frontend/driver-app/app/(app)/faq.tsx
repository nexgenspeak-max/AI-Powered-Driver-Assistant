import { View, ScrollView, Text } from 'react-native'
import { BackButton } from '../../src/components/BackButton'
import { FaqContent } from '../../src/features/info/components/FaqContent'

export default function FaqScreen() {
  return (
    <View className="flex-1 bg-surface">
      <BackButton />
      <ScrollView className="flex-1" contentContainerClassName="p-5 pt-28 gap-4">
        <Text className="text-xl font-extrabold text-gray-900">Câu hỏi thường gặp</Text>
        <FaqContent />
      </ScrollView>
    </View>
  )
}
