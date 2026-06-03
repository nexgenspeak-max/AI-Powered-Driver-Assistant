import { View, Text } from 'react-native'

interface Props { label: string; className?: string }

export function Badge({ label, className }: Props) {
  return (
    <View className={`px-2.5 py-1 rounded-full ${className ?? 'bg-gray-100'}`}>
      <Text className="text-xs font-semibold">{label}</Text>
    </View>
  )
}
