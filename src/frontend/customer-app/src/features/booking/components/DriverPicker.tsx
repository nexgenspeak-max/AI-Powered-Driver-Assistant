import { ActivityIndicator, TouchableOpacity } from 'react-native'
import { Text, View, YStack, useThemeName } from 'tamagui'
import { Ionicons } from '@expo/vector-icons'
import { useQuery } from '@tanstack/react-query'
import { driversService } from '../../../services/api/drivers'
import type { Driver } from '../../../types'

interface Props {
  selected: Driver | null
  onSelect: (driver: Driver) => void
  error?: string
}

// Replaces the old "auto-match nearest driver" flow — the customer picks
// who drives them from whoever is online right now (GET /drivers/online),
// no location/distance logic involved. Booking then sends that driver's
// phone directly (same driver_phone-based POST /trips it always was).
export function DriverPicker({ selected, onSelect, error }: Props) {
  const isLight = useThemeName() === 'light'
  const { data: drivers, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['drivers', 'online'],
    queryFn: () => driversService.listOnline(),
  })

  return (
    <YStack gap="$2">
      <View flexDirection="row" alignItems="center" justifyContent="space-between">
        <Text fontSize="$2" fontWeight="600" color="$textSecondary">
          Chọn tài xế
        </Text>
        <TouchableOpacity
          onPress={() => refetch()}
          disabled={isRefetching}
          hitSlop={12}
          style={{ padding: 10 }}
          accessibilityRole="button"
          accessibilityLabel="Làm mới danh sách tài xế"
        >
          {isRefetching ? (
            <ActivityIndicator size="small" color="#8B5CF6" />
          ) : (
            <Ionicons name="refresh" size={16} color="#8B5CF6" />
          )}
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View paddingVertical="$4" alignItems="center">
          <ActivityIndicator size="small" color="#8B5CF6" />
        </View>
      ) : isError ? (
        <Text fontSize="$2" color="$danger">
          Không tải được danh sách tài xế. Thử lại sau.
        </Text>
      ) : !drivers || drivers.length === 0 ? (
        <View
          borderRadius={16}
          padding="$4"
          alignItems="center"
          backgroundColor={isLight ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.04)'}
        >
          <Text fontSize="$2" color="$textMuted" textAlign="center">
            Hiện chưa có tài xế nào online. Vui lòng thử lại sau.
          </Text>
        </View>
      ) : (
        <YStack gap="$2">
          {drivers.map(driver => {
            const isSelected = selected?.phone === driver.phone
            return (
              <TouchableOpacity key={driver.phone} onPress={() => onSelect(driver)} activeOpacity={0.8}>
                <View
                  flexDirection="row"
                  alignItems="center"
                  gap="$3"
                  borderRadius={14}
                  padding="$3"
                  borderWidth={1.5}
                  borderColor={isSelected ? '#8B5CF6' : isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)'}
                  backgroundColor={isSelected ? 'rgba(139,92,246,0.1)' : 'transparent'}
                >
                  <View
                    width={40}
                    height={40}
                    borderRadius={20}
                    alignItems="center"
                    justifyContent="center"
                    backgroundColor={isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)'}
                  >
                    <Text fontWeight="700" fontSize="$3" color="$textPrimary">
                      {driver.name?.trim().charAt(0).toUpperCase() || 'T'}
                    </Text>
                  </View>
                  <YStack flex={1}>
                    <Text fontWeight="700" fontSize="$3" color="$textPrimary" numberOfLines={1}>
                      {driver.name}
                    </Text>
                    <Text fontSize="$1" color="$textSecondary" numberOfLines={1}>
                      {[driver.vehicle_type, driver.vehicle_plate].filter(Boolean).join(' · ') || driver.phone}
                    </Text>
                  </YStack>
                  {isSelected && <Ionicons name="checkmark-circle" size={22} color="#8B5CF6" />}
                </View>
              </TouchableOpacity>
            )
          })}
        </YStack>
      )}

      {error && (
        <Text fontSize="$1" color="$danger">
          {error}
        </Text>
      )}
    </YStack>
  )
}
