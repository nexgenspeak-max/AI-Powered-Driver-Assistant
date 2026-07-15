import { TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'

export function BackButton() {
  return (
    <TouchableOpacity
      onPress={() => router.replace('/profile')}
      className="absolute top-14 left-5 z-10 w-10 h-10 rounded-full bg-white border border-gray-100 shadow-sm items-center justify-center"
      hitSlop={8}
    >
      <Ionicons name="arrow-back" size={20} color="#111827" />
    </TouchableOpacity>
  )
}
