import { YStack, Text } from 'tamagui'

export function EmptyDeliveryState() {
  return (
    <YStack flex={1} alignItems="center" justifyContent="center" paddingVertical="$10">
      <Text fontSize={48} marginBottom="$3">
        📦
      </Text>
      <Text fontWeight="700" color="$textSecondary" fontSize="$4">
        Chưa có đơn giao hàng
      </Text>
      <Text fontSize="$2" color="$textSecondary" marginTop="$1" textAlign="center">
        Nhấn "Thêm đơn hàng" để tạo đơn giao hàng mới
      </Text>
    </YStack>
  )
}
