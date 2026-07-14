import { View, Text } from 'react-native'

export function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row justify-between">
      <Text className="text-gray-400 text-xs">{label}</Text>
      <Text className="text-gray-900 text-xs font-medium">{value}</Text>
    </View>
  )
}
