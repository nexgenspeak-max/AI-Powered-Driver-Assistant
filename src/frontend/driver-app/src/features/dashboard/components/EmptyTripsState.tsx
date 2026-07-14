import { View, Text } from 'react-native'

export function EmptyTripsState({ isOnline }: { isOnline: boolean }) {
  return (
    <View className="flex-1 items-center justify-center py-20">
      <Text className="text-5xl mb-3">✅</Text>
      <Text className="font-bold text-gray-600 text-base">
        {isOnline ? 'No trips right now' : 'You are offline'}
      </Text>
      <Text className="text-sm text-gray-400 mt-1 text-center">
        {isOnline ? 'Waiting for new assignments...' : 'Toggle Online to start receiving trips'}
      </Text>
    </View>
  )
}
