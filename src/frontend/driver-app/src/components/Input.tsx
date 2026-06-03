import { View, Text, TextInput, type TextInputProps } from 'react-native'

interface Props extends TextInputProps {
  label?: string
  error?: string
}

export function Input({ label, error, ...props }: Props) {
  return (
    <View className="gap-1">
      {label && <Text className="text-sm font-medium text-gray-700">{label}</Text>}
      <TextInput
        className={`border rounded-xl px-4 py-3 text-base bg-white text-gray-900 ${error ? 'border-red-400' : 'border-gray-200'}`}
        placeholderTextColor="#9ca3af"
        {...props}
      />
      {error && <Text className="text-xs text-red-500">{error}</Text>}
    </View>
  )
}
