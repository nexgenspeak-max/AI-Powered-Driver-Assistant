import { useState } from 'react'
import { styled, Text, View, useTheme } from 'tamagui'
import type { LayoutChangeEvent } from 'react-native'
import { GlassSheen } from './LiquidGlass'

const BadgeFrame = styled(View, {
  flexDirection: 'row',
  alignItems: 'center',
  gap: '$1',
  paddingHorizontal: 10,
  paddingVertical: 4,
  borderRadius: '$pill',
  alignSelf: 'flex-start',
  overflow: 'hidden',
})

interface Props {
  label: string
  /** Tamagui color token or literal color, e.g. "$primaryMuted" or "rgba(255,255,255,0.08)". Defaults to a neutral theme-aware chip. */
  backgroundColor?: string
  color?: string
  /** Optional leading icon (e.g. a small status dot) rendered before the label. */
  icon?: React.ReactNode
}

export function Badge({ label, backgroundColor, color, icon }: Props) {
  const theme = useTheme()
  const [height, setHeight] = useState(0)

  const handleLayout = (e: LayoutChangeEvent) => {
    setHeight(e.nativeEvent.layout.height)
  }

  return (
    <BadgeFrame backgroundColor={backgroundColor ?? theme.chip.val} onLayout={handleLayout}>
      <GlassSheen borderRadius={height / 2} />
      {icon}
      <Text fontSize={11} fontWeight="600" color={color ?? theme.onSurfaceVariant.val}>
        {label}
      </Text>
    </BadgeFrame>
  )
}
