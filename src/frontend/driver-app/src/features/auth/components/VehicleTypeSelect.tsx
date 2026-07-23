import { XStack, YStack, Text, useTheme } from 'tamagui'
import { Pressable } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

const OPTIONS = [
  { value: 'motorbike', label: 'Xe máy' },
  { value: 'car_4', label: 'Ô tô 4 chỗ' },
  { value: 'car_7', label: 'Ô tô 7 chỗ' },
  { value: 'truck', label: 'Xe tải' },
]

interface Props {
  value: string
  onChange: (value: string) => void
  error?: string
}

export function VehicleTypeSelect({ value, onChange, error }: Props) {
  const theme = useTheme()

  return (
    <YStack gap="$1">
      <Text fontSize="$2" fontWeight="500" color="$textSecondary">
        Vehicle type
      </Text>
      <XStack flexWrap="wrap" gap="$2">
        {OPTIONS.map(opt => {
          const selected = value === opt.value
          return (
            // Plain RN Pressable, not a `styled(TouchableOpacity, ...)` frame
            // — TouchableOpacity's onPressIn/onPressOut, tracked into an
            // external useState, proved unreliable here (missed onPressOut,
            // stale/stuck highlight on whichever chip was pressed last).
            // Pressable's `style` render-prop ties directly to RN's own
            // touch-responder state instead, so there's no separate state to
            // get out of sync per-item in the first place.
            <Pressable
              key={opt.value}
              onPress={() => onChange(opt.value)}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 12,
                borderWidth: selected ? 2 : 1,
                borderColor: selected ? theme.primary.val : theme.border.val,
                backgroundColor: selected ? theme.primary.val : theme.surfaceElevated.val,
                // Same translucent-white-overlay idea as before (brightens
                // either the unselected or the selected/purple fill without
                // fighting it for the same style property), just computed
                // inline instead of a separate absolutely-positioned layer.
                opacity: pressed ? 0.75 : 1,
              })}
            >
              {selected && <Ionicons name="checkmark-circle" size={15} color="#ffffff" />}
              <Text color={selected ? '$textInverse' : '$textSecondary'} fontWeight={selected ? '700' : '400'}>
                {opt.label}
              </Text>
            </Pressable>
          )
        })}
      </XStack>
      {error && (
        <Text fontSize="$1" color="$danger">
          {error}
        </Text>
      )}
    </YStack>
  )
}
