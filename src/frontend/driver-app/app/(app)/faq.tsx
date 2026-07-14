import { ScrollView, Text } from 'react-native'
import { FaqContent } from '../../src/features/info/components/FaqContent'

export default function FaqScreen() {
  return (
    <ScrollView className="flex-1 bg-surface" contentContainerClassName="p-5 pt-16 gap-4">
      <Text className="text-xl font-extrabold text-gray-900">Câu hỏi thường gặp</Text>
      <FaqContent />
    </ScrollView>
  )
}
