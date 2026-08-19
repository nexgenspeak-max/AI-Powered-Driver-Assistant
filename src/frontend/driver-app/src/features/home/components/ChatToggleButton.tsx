import { useTheme } from 'tamagui'
import Animated from 'react-native-reanimated'
import { GestureDetector } from 'react-native-gesture-handler'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useThemeStore } from '../../../stores/themeStore'
import { GlassMaterial, GlowOverlay, useGlassPress } from '../../../components/LiquidGlass'

// Mirrors src/components/BackButton.tsx's pattern (same glass button look
// used app-wide) — pinned top-left like BackButton itself, but that's fine
// here since Home (the only screen this renders on) never shows a
// BackButton. Kept off the top-right corner on purpose: the map's own
// compass control renders there, and this used to sit right on top of it.
export const CHAT_TOGGLE_BUTTON_SIZE = 40
const CHAT_TOGGLE_BUTTON_LEFT = 20
const CHAT_TOGGLE_BUTTON_TOP_GAP = 12

interface Props {
  onPress: () => void
}

export function ChatToggleButton({ onPress }: Props) {
  const theme = useTheme()
  const themeMode = useThemeStore(s => s.mode)
  const insets = useSafeAreaInsets()
  const { gesture, stretchStyle, touchX, touchY, glowOpacity } = useGlassPress(
    CHAT_TOGGLE_BUTTON_SIZE,
    CHAT_TOGGLE_BUTTON_SIZE,
    { onPress, hitSlop: 10 },
  )

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        style={[
          {
            position: 'absolute',
            left: CHAT_TOGGLE_BUTTON_LEFT,
            top: insets.top + CHAT_TOGGLE_BUTTON_TOP_GAP,
            zIndex: 10,
            width: CHAT_TOGGLE_BUTTON_SIZE,
            height: CHAT_TOGGLE_BUTTON_SIZE,
            borderRadius: CHAT_TOGGLE_BUTTON_SIZE / 2,
            // margin: 0,
          },
          stretchStyle,
        ]}
      >
        <GlassMaterial
          borderRadius={CHAT_TOGGLE_BUTTON_SIZE / 2}
          tint={themeMode === 'dark' ? 'dark' : 'light'}
          style={{ width: CHAT_TOGGLE_BUTTON_SIZE, height: CHAT_TOGGLE_BUTTON_SIZE }}
        >
          <GlowOverlay size={70} id="chatToggleGlow" touchX={touchX} touchY={touchY} glowOpacity={glowOpacity} />
          <Ionicons name="chatbubble-ellipses" size={20} color={theme.textPrimary.val} />
        </GlassMaterial>
      </Animated.View>
    </GestureDetector>
  )
}
