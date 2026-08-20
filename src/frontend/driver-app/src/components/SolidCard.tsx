import type { ReactNode } from 'react'
import { TouchableOpacity, View } from 'react-native'
import { useTheme } from 'tamagui'

// Plain solid card — deliberately NOT GlassSurface's glassmorphism wash.
// Same minimal prop shape as GlassSurface (cornerRadius/onPress/style/
// children) so it's a drop-in swap wherever a map overlay needs to stay
// legible at a glance (over a constantly-changing map underneath) rather
// than blend into it. Resolves `$surfaceElevated` via useTheme() (not a
// Tamagui `backgroundColor="$surfaceElevated"` prop) since this is a plain
// RN View/TouchableOpacity, so it still follows dark/light mode correctly.
export function SolidCard({
  cornerRadius = 20,
  onPress,
  style,
  children,
}: {
  cornerRadius?: number
  onPress?: () => void
  style?: object
  children?: ReactNode
}) {
  const theme = useTheme()
  const cardStyle = [
    {
      backgroundColor: theme.surfaceElevated.val,
      borderRadius: cornerRadius,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 12,
      elevation: 6,
    },
    style,
  ]

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={cardStyle}>
        {children}
      </TouchableOpacity>
    )
  }
  return <View style={cardStyle}>{children}</View>
}
