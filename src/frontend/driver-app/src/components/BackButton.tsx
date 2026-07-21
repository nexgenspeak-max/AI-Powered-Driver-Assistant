import { useTheme } from 'tamagui'
import Animated from 'react-native-reanimated'
import { GestureDetector } from 'react-native-gesture-handler'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { useThemeStore } from '../stores/themeStore'
import { GlassMaterial, GlowOverlay, useGlassPress } from './LiquidGlass'

export const BACK_BUTTON_SIZE = 40
const BACK_BUTTON_LEFT = 20
// Gap between the safe-area top inset and the button itself.
export const BACK_BUTTON_TOP_GAP = 12

// Vertical space a screen needs to reserve so its content clears a floating
// `BackButton` — screens that render one should use this (plus their own
// content gap) instead of guessing a paddingTop number.
export function getBackButtonClearance(insetsTop: number) {
  return insetsTop + BACK_BUTTON_TOP_GAP + BACK_BUTTON_SIZE
}

export function BackButton() {
  const theme = useTheme()
  const themeMode = useThemeStore(s => s.mode)
  const insets = useSafeAreaInsets()
  const { gesture, stretchStyle, touchX, touchY, glowOpacity } = useGlassPress(BACK_BUTTON_SIZE, BACK_BUTTON_SIZE, {
    onPress: () => router.replace('/profile'),
    hitSlop: 10,
  })

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        style={[
          {
            position: 'absolute',
            left: BACK_BUTTON_LEFT,
            top: insets.top + BACK_BUTTON_TOP_GAP,
            zIndex: 10,
            width: BACK_BUTTON_SIZE,
            height: BACK_BUTTON_SIZE,
            borderRadius: BACK_BUTTON_SIZE / 2,
          },
          stretchStyle,
        ]}
      >
        <GlassMaterial
          borderRadius={BACK_BUTTON_SIZE / 2}
          tint={themeMode === 'dark' ? 'dark' : 'light'}
          style={{ width: BACK_BUTTON_SIZE, height: BACK_BUTTON_SIZE }}
        >
          <GlowOverlay size={70} id="backButtonGlow" touchX={touchX} touchY={touchY} glowOpacity={glowOpacity} />
          <Ionicons name="arrow-back" size={20} color={theme.textPrimary.val} />
        </GlassMaterial>
      </Animated.View>
    </GestureDetector>
  )
}
