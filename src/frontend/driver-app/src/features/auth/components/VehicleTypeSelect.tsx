import { View, Text, TouchableOpacity } from 'react-native'

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
  return (
    <View className="gap-1">
      <Text className="text-sm font-medium text-gray-700">Vehicle type</Text>
      <View className="flex-row flex-wrap gap-2">
        {OPTIONS.map(opt => (
          <TouchableOpacity
            key={opt.value}
            onPress={() => onChange(opt.value)}
            className={`px-3 py-2 rounded-xl border ${value === opt.value ? 'bg-primary border-primary' : 'bg-white border-gray-200'}`}
          >
            <Text className={value === opt.value ? 'text-white font-semibold' : 'text-gray-700'}>{opt.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {error && <Text className="text-xs text-red-500">{error}</Text>}
    </View>
  )
}
