/**
 * AssistantTabButton — native Siri-style orb (iOS/Android).
 * Web uses AssistantTabButton.web.tsx (CSS conic-gradient).
 */
import { LayoutChangeEvent, Pressable, StyleSheet, View } from 'react-native'
import Animated from 'react-native-reanimated'
import { Text } from 'tamagui'
import { LinearGradient } from 'expo-linear-gradient'
import { GlassMaterial } from './LiquidGlass'
import { AssistantOrbCenter } from './AssistantOrbCenter'
import {
  AssistantTabLabel,
  BUTTON_RISE,
  CARD_MARGIN,
  CARD_WIDTH,
  ORB_LAYER_A,
  ORB_LAYER_B,
  ORB_LOCATIONS,
  ORB_SIZE,
  STATUS_ACCESSIBILITY_LABEL,
  SPIN_SIZE,
  useAssistantTabButton,
} from './assistantTabButtonShared'

export {
  AssistantTabLabel,
  BUTTON_LABEL_OVERHANG,
  BUTTON_RISE,
  BUTTON_SIZE,
  ORB_SIZE,
} from './assistantTabButtonShared'

const orbShadow = {
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.45,
  shadowRadius: 16,
  elevation: 12,
}

export function AssistantTabButton({ centerX, barWidth }: { centerX: number; barWidth: number }) {
  const {
    theme,
    voice,
    expandedText,
    cardHeight,
    setCardHeight,
    handlePress,
    reduceMotion,
    connectedMuted,
    isError,
    orbStyle,
    bloomStyle,
    ringStyle,
    spinStyle,
    spinBStyle,
  } = useAssistantTabButton()

  if (barWidth <= 0) return null

  const left = centerX - ORB_SIZE / 2
  const cardLeft = Math.min(Math.max(centerX - CARD_WIDTH / 2, CARD_MARGIN), barWidth - CARD_WIDTH - CARD_MARGIN)
  const errorGradient: [string, string] = [theme.danger.val, theme.onDangerContainer.val]

  return (
    <>
      {expandedText ? (
        <View
          style={[styles.cardWrap, { left: cardLeft, top: -BUTTON_RISE - ORB_SIZE - cardHeight - 12 }]}
          onLayout={(e: LayoutChangeEvent) => setCardHeight(e.nativeEvent.layout.height)}
          pointerEvents="none"
        >
          <GlassMaterial borderRadius={18}>
            <Text numberOfLines={4} color="$textPrimary" fontSize="$1" padding={10} textAlign="center">
              {expandedText}
            </Text>
          </GlassMaterial>
        </View>
      ) : null}

      <Pressable
        onPress={handlePress}
        hitSlop={8}
        accessible
        accessibilityRole="button"
        accessibilityLabel={
          connectedMuted ? 'Trợ lý AI đang kết nối, micro tắt. Nhấn để tắt phiên.' : STATUS_ACCESSIBILITY_LABEL[voice.status]
        }
        onAccessibilityTap={handlePress}
        style={({ pressed }) => [styles.wrap, { left, top: -BUTTON_RISE }, pressed ? { opacity: 0.94, transform: [{ scale: 0.95 }] } : null]}
      >
        <Animated.View
          pointerEvents="none"
          style={[
            styles.bloom,
            bloomStyle,
            {
              shadowColor: theme.primary.val,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.65,
              shadowRadius: 20,
            },
          ]}
        />

        <Animated.View pointerEvents="none" style={[styles.liveRing, ringStyle, { borderColor: theme.secondary.val }]} />

        <Animated.View style={[styles.orb, orbStyle, orbShadow, { shadowColor: theme.gradientStart.val }]}>
          {isError ? (
            <LinearGradient colors={errorGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
          ) : voice.status === 'idle' ? (
            <LinearGradient
              colors={['#7C3AED', '#8B5CF6', '#A855F7']}
              locations={[0, 0.5, 1]}
              start={{ x: 0.1, y: 0 }}
              end={{ x: 0.9, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
          ) : (
            <>
              <Animated.View style={[styles.spinLayer, spinStyle]}>
                <LinearGradient
                  colors={ORB_LAYER_A}
                  locations={ORB_LOCATIONS}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
              </Animated.View>
              <Animated.View style={[styles.spinLayer, styles.spinLayerB, spinBStyle]}>
                <LinearGradient
                  colors={ORB_LAYER_B}
                  locations={ORB_LOCATIONS}
                  start={{ x: 1, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
              </Animated.View>
            </>
          )}

          <LinearGradient
            colors={['rgba(255,255,255,0.5)', 'rgba(255,255,255,0.12)', 'rgba(255,255,255,0)']}
            locations={[0, 0.28, 0.62]}
            start={{ x: 0.22, y: 0 }}
            end={{ x: 0.72, y: 0.75 }}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
          <LinearGradient
            colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.18)']}
            locations={[0.55, 1]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
          <AssistantOrbCenter status={voice.status} iconColor={theme.textInverse.val} reduceMotion={reduceMotion} />
          {connectedMuted ? (
            <View style={[styles.muteDot, { backgroundColor: theme.danger.val, borderColor: theme.textInverse.val }]} />
          ) : null}
        </Animated.View>
      </Pressable>
    </>
  )
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    width: ORB_SIZE,
    height: ORB_SIZE,
    zIndex: 60,
    elevation: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bloom: {
    position: 'absolute',
    width: ORB_SIZE + 36,
    height: ORB_SIZE + 36,
    borderRadius: (ORB_SIZE + 36) / 2,
    backgroundColor: 'transparent',
  },
  liveRing: {
    position: 'absolute',
    width: ORB_SIZE + 16,
    height: ORB_SIZE + 16,
    borderRadius: (ORB_SIZE + 16) / 2,
    borderWidth: 2,
  },
  orb: {
    width: ORB_SIZE,
    height: ORB_SIZE,
    borderRadius: ORB_SIZE / 2,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.42)',
  },
  spinLayer: {
    position: 'absolute',
    width: SPIN_SIZE,
    height: SPIN_SIZE,
    left: (ORB_SIZE - SPIN_SIZE) / 2,
    top: (ORB_SIZE - SPIN_SIZE) / 2,
  },
  spinLayerB: {
    opacity: 0.62,
  },
  muteDot: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
    zIndex: 6,
  },
  cardWrap: { position: 'absolute', width: CARD_WIDTH, zIndex: 59, elevation: 59 },
})
