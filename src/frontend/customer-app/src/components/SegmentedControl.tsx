import { useEffect, useState } from 'react'
import { LayoutChangeEvent, Pressable, StyleSheet, type ViewStyle } from 'react-native'
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'
import { LinearGradient } from 'expo-linear-gradient'
import { View, useTheme } from 'tamagui'
import { Ionicons } from '@expo/vector-icons'
import { AppText } from './AppText'
import { CTA_GRADIENT } from './LiquidGlass'
import { haptics } from '../utils/haptics'

// One segmented control for the whole app — replaces the near-identical
// hand-rolled versions in DashboardModeSwitch, EarningsPeriodTabs and
// PickupTimeField's mode toggle. Active segment = a sliding gradient pill.
//
// Duplicated in customer-app/src/components/SegmentedControl.tsx.

const HEIGHT = 48
const PAD = 4

export type SegmentOption<T extends string> = {
  value: T
  label: string
  icon?: keyof typeof Ionicons.glyphMap
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  style,
}: {
  options: Array<SegmentOption<T>>
  value: T
  onChange: (value: T) => void
  style?: ViewStyle
}) {
  const theme = useTheme()
  const reduced = useReducedMotion()
  const [trackW, setTrackW] = useState(0)

  const count = Math.max(1, options.length)
  const activeIndex = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  )
  const segW = trackW > 0 ? (trackW - PAD * 2) / count : 0

  const tx = useSharedValue(0)
  useEffect(() => {
    tx.value = withTiming(PAD + activeIndex * segW, {
      duration: reduced ? 0 : 200,
    })
  }, [activeIndex, segW, reduced, tx])

  const pillStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }],
  }))

  const onLayout = (e: LayoutChangeEvent) => setTrackW(e.nativeEvent.layout.width)

  return (
    <View
      height={HEIGHT}
      flexDirection="row"
      padding={PAD}
      borderRadius="$control"
      backgroundColor="$surfaceVariant"
      onLayout={onLayout}
      style={style}
    >
      {segW > 0 && (
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFillObject,
            { width: segW, top: PAD, bottom: PAD, borderRadius: 10 },
            pillStyle,
          ]}
        >
          <LinearGradient
            colors={CTA_GRADIENT}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[StyleSheet.absoluteFillObject, { borderRadius: 10 }]}
          />
        </Animated.View>
      )}

      {options.map((opt) => {
        const active = opt.value === value
        return (
          <Pressable
            key={opt.value}
            onPress={() => {
              if (opt.value !== value) {
                haptics.selection()
                onChange(opt.value)
              }
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            style={({ pressed }) => ({
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              paddingHorizontal: 4,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            {opt.icon && (
              <Ionicons
                name={opt.icon}
                size={16}
                color={active ? '#ffffff' : theme.textSecondary.val}
              />
            )}
            {/* `numberOfLines`/`adjustsFontSizeToFit` — 3+ segments with longer
                labels (e.g. trip-status tabs) previously wrapped to 2 lines
                inside this control's fixed HEIGHT, overflowing (no
                overflow:hidden on the track) and visually overlapping the
                neighboring segment/pill instead of just looking cramped. */}
            <AppText
              variant="label"
              color={active ? '#ffffff' : '$textSecondary'}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.85}
            >
              {opt.label}
            </AppText>
          </Pressable>
        )
      })}
    </View>
  )
}
