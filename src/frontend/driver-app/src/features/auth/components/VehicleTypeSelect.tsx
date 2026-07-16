import { styled, XStack, YStack, Text } from 'tamagui'
import { TouchableOpacity } from 'react-native'

const OPTIONS = [
  { value: 'motorbike', label: 'Xe máy' },
  { value: 'car_4', label: 'Ô tô 4 chỗ' },
  { value: 'car_7', label: 'Ô tô 7 chỗ' },
  { value: 'truck', label: 'Xe tải' },
]

const OptionFrame = styled(TouchableOpacity, {
  paddingHorizontal: '$3',
  paddingVertical: '$2',
  borderRadius: '$control',
  borderWidth: 1,
  borderColor: '$border',
  backgroundColor: '$surfaceElevated',

  variants: {
    selected: {
      true: { backgroundColor: '$primary', borderColor: '$primary' },
    },
  } as const,
})

interface Props {
  value: string
  onChange: (value: string) => void
  error?: string
}

export function VehicleTypeSelect({ value, onChange, error }: Props) {
  return (
    <YStack gap="$1">
      <Text fontSize="$2" fontWeight="500" color="$textSecondary">
        Vehicle type
      </Text>
      <XStack flexWrap="wrap" gap="$2">
        {OPTIONS.map(opt => {
          const selected = value === opt.value
          return (
            <OptionFrame key={opt.value} selected={selected} onPress={() => onChange(opt.value)}>
              <Text color={selected ? '$textInverse' : '$textSecondary'} fontWeight={selected ? '600' : '400'}>
                {opt.label}
              </Text>
            </OptionFrame>
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
