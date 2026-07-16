import { styled, useTheme } from 'tamagui'
import { TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'

const BackButtonFrame = styled(TouchableOpacity, {
  position: 'absolute',
  top: 56,
  left: 20,
  zIndex: 10,
  width: 40,
  height: 40,
  borderRadius: '$pill',
  backgroundColor: '$surfaceElevated',
  borderWidth: 1,
  borderColor: '$border',
  alignItems: 'center',
  justifyContent: 'center',
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.3,
  shadowRadius: 8,
})

export function BackButton() {
  const theme = useTheme()
  return (
    <BackButtonFrame onPress={() => router.replace('/profile')} hitSlop={8}>
      <Ionicons name="arrow-back" size={20} color={theme.textPrimary.val} />
    </BackButtonFrame>
  )
}
