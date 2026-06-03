import { TouchableOpacity, Text, ActivityIndicator, View } from 'react-native'

interface Props {
  label: string
  onPress?: () => void
  variant?: 'primary' | 'outline' | 'danger' | 'success' | 'dark'
  loading?: boolean
  disabled?: boolean
  full?: boolean
}

const VARIANTS = {
  primary: { btn: 'bg-primary',   text: 'text-white'      },
  dark:    { btn: 'bg-dark',      text: 'text-white'      },
  outline: { btn: 'bg-white border border-gray-300', text: 'text-gray-700' },
  danger:  { btn: 'bg-red-500',   text: 'text-white'      },
  success: { btn: 'bg-green-500', text: 'text-white'      },
}

export function Button({ label, onPress, variant = 'primary', loading, disabled, full }: Props) {
  const v = VARIANTS[variant]
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      className={`${v.btn} ${full ? 'flex-1' : ''} py-3 px-5 rounded-xl items-center flex-row justify-center gap-2 ${(disabled || loading) ? 'opacity-50' : ''}`}
      activeOpacity={0.8}
    >
      {loading && <ActivityIndicator size="small" color="#fff" />}
      <Text className={`${v.text} font-semibold text-base`}>{label}</Text>
    </TouchableOpacity>
  )
}
