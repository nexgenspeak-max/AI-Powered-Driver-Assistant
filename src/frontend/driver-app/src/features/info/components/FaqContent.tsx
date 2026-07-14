import { useState } from 'react'
import { View, Text, TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { FAQ_ITEMS } from '../data/faqData'

export function FaqContent() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  return (
    <View className="gap-2.5">
      {FAQ_ITEMS.map((item, i) => {
        const isOpen = openIndex === i
        return (
          <View key={i} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <TouchableOpacity
              onPress={() => setOpenIndex(isOpen ? null : i)}
              className="flex-row items-center justify-between px-4 py-3"
            >
              <Text className="font-semibold text-gray-900 flex-1 pr-2">{item.question}</Text>
              <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={18} color="#9ca3af" />
            </TouchableOpacity>
            {isOpen && (
              <Text className="text-gray-500 leading-6 px-4 pb-3.5">{item.answer}</Text>
            )}
          </View>
        )
      })}
    </View>
  )
}
