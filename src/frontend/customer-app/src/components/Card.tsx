import { View } from 'react-native'

interface Props { children: React.ReactNode; className?: string }

export function Card({ children, className }: Props) {
  return (
    <View className={`bg-white rounded-2xl border border-gray-100 shadow-sm p-4 ${className ?? ''}`}>
      {children}
    </View>
  )
}
