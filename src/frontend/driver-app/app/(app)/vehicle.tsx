import { useState } from 'react'
import { ScrollView, Alert } from 'react-native'
import { View, YStack, Text } from 'tamagui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { BackButton, getBackButtonClearance } from '../../src/components/BackButton'
import { GlassSurface } from '../../src/components/GlassSurface'
import { Input } from '../../src/components/Input'
import { Button } from '../../src/components/Button'
import { authService } from '../../src/services/api/auth'
import { useCurrentUser } from '../../src/features/auth/hooks/useCurrentUser'

export default function VehicleScreen() {
  const insets = useSafeAreaInsets()
  const queryClient = useQueryClient()
  const { data: driver } = useCurrentUser()
  const [vehicleType, setVehicleType] = useState(driver?.vehicle_type ?? '')
  const [vehicleName, setVehicleName] = useState(driver?.vehicle_name ?? '')
  const [vehiclePlate, setVehiclePlate] = useState(driver?.vehicle_plate ?? '')

  const { mutate: save, isPending } = useMutation({
    mutationFn: () =>
      authService.updateVehicle(driver!.id, {
        vehicle_type: vehicleType.trim(),
        vehicle_name: vehicleName.trim(),
        vehicle_plate: vehiclePlate.trim(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] })
      queryClient.invalidateQueries({ queryKey: ['driverContext'] })
      Alert.alert('Đã lưu', 'Thông tin xe đã được cập nhật.')
    },
    onError: () => Alert.alert('Lỗi', 'Không thể lưu thông tin xe, vui lòng thử lại.'),
  })

  if (!driver) return null

  const canSave =
    vehicleType.trim() !== (driver.vehicle_type ?? '') ||
    vehicleName.trim() !== (driver.vehicle_name ?? '') ||
    vehiclePlate.trim() !== (driver.vehicle_plate ?? '')

  return (
    <View flex={1} backgroundColor="$surface">
      <BackButton />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20, paddingTop: getBackButtonClearance(insets.top) + 16, paddingBottom: 100, gap: 20 }}
      >
        <Text fontSize="$6" fontWeight="800" color="$textPrimary">
          Quản lý xe
        </Text>

        <GlassSurface cornerRadius={20} outline>
          <YStack padding="$4" gap="$4">
            <Input label="Loại xe" value={vehicleType} onChangeText={setVehicleType} placeholder="VD: Sedan, SUV, Xe máy" />
            <Input label="Tên xe" value={vehicleName} onChangeText={setVehicleName} placeholder="VD: Toyota Vios" />
            <Input label="Biển số" value={vehiclePlate} onChangeText={setVehiclePlate} placeholder="VD: 36B6-36363" autoCapitalize="characters" />
          </YStack>
        </GlassSurface>

        <Button label="Lưu thay đổi" onPress={() => save()} loading={isPending} disabled={!canSave} full />
      </ScrollView>
    </View>
  )
}
