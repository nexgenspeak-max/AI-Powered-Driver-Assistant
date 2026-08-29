/**
 * AssistantTabButton.web — lightweight purple orb. Static when idle; one CSS spin
 * only while connecting/connected. No filter:blur / mix-blend-mode (CPU hogs).
 */
import { useEffect, useState } from 'react'
import { LayoutChangeEvent, Pressable, StyleSheet, View } from 'react-native'
import { Text } from 'tamagui'
import { GlassMaterial } from './LiquidGlass'
import { AssistantOrbCenter } from './AssistantOrbCenter'
import {
  AssistantTabLabel,
  BUTTON_RISE,
  CARD_MARGIN,
  CARD_WIDTH,
  ORB_CONIC_A,
  ORB_SIZE,
  SPIN_DURATION,
  STATUS_ACCESSIBILITY_LABEL,
  useAssistantTabButton,
} from './assistantTabButtonShared'

export {
  AssistantTabLabel,
  BUTTON_LABEL_OVERHANG,
  BUTTON_RISE,
  BUTTON_SIZE,
  ORB_SIZE,
} from './assistantTabButtonShared'

const STYLE_ID = 'assistant-siri-orb-keyframes'
const IDLE_GRADIENT = 'linear-gradient(145deg, #7C3AED 0%, #8B5CF6 48%, #A855F7 100%)'

function ensureOrbKeyframes() {
  if (typeof document === 'undefined') return
  if (document.getElementById(STYLE_ID)) return
  const el = document.createElement('style')
  el.id = STYLE_ID
  el.textContent = `
    @keyframes assistantSiriSpin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `
  document.head.appendChild(el)
}

function usePageVisible() {
  const [visible, setVisible] = useState(true)
  useEffect(() => {
    if (typeof document === 'undefined') return
    const onVis = () => setVisible(document.visibilityState === 'visible')
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])
  return visible
}

type WebCssViewStyle = Record<string, unknown>

function SiriOrbWeb({
  status,
  reduceMotion,
  isError,
  errorColors,
  iconColor,
  pageVisible,
}: {
  status: keyof typeof SPIN_DURATION
  reduceMotion: boolean
  isError: boolean
  errorColors: [string, string]
  iconColor: string
  pageVisible: boolean
}) {
  const spinActive = pageVisible && !reduceMotion && !isError && (status === 'connecting' || status === 'connected')
  const spinMs = SPIN_DURATION[status] || 10000

  const orbShellCss: WebCssViewStyle = {
    width: ORB_SIZE,
    height: ORB_SIZE,
    borderRadius: ORB_SIZE / 2,
    overflow: 'hidden',
    position: 'relative',
    boxShadow: '0 8px 28px rgba(124, 58, 237, 0.42), inset 0 1px 0 rgba(255,255,255,0.4)',
  }

  const fillCss: WebCssViewStyle = isError
    ? {
        ...StyleSheet.absoluteFillObject,
        backgroundImage: `linear-gradient(135deg, ${errorColors[0]}, ${errorColors[1]})`,
      }
    : spinActive
      ? {
          position: 'absolute',
          width: '180%',
          height: '180%',
          left: '-40%',
          top: '-40%',
          backgroundImage: ORB_CONIC_A,
          animation: `assistantSiriSpin ${spinMs}ms linear infinite`,
          animationPlayState: pageVisible ? 'running' : 'paused',
        }
      : {
          ...StyleSheet.absoluteFillObject,
          backgroundImage: IDLE_GRADIENT,
        }

  const glassStack: WebCssViewStyle = {
    ...StyleSheet.absoluteFillObject,
    backgroundImage:
      'radial-gradient(circle at 28% 20%, rgba(255,255,255,0.72) 0%, rgba(255,255,255,0) 36%), ' +
      'radial-gradient(circle at 50% 100%, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0) 52%)',
    pointerEvents: 'none',
  }

  return (
    <View style={orbShellCss as object}>
      <View style={fillCss as object} />
      <View style={glassStack as object} />
      <AssistantOrbCenter status={status} iconColor={iconColor} reduceMotion={reduceMotion} />
    </View>
  )
}

export function AssistantTabButton({ centerX, barWidth }: { centerX: number; barWidth: number }) {
  const pageVisible = usePageVisible()

  useEffect(() => {
    ensureOrbKeyframes()
  }, [])

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
  } = useAssistantTabButton()

  if (barWidth <= 0) return null

  const left = centerX - ORB_SIZE / 2
  const cardLeft = Math.min(Math.max(centerX - CARD_WIDTH / 2, CARD_MARGIN), barWidth - CARD_WIDTH - CARD_MARGIN)
  const errorGradient: [string, string] = [theme.danger.val, theme.onDangerContainer.val]
  const showRing = voice.status === 'connecting' || voice.status === 'connected'

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
        style={({ pressed }) => [
          styles.wrap,
          { left, top: -BUTTON_RISE },
          { cursor: voice.status === 'connecting' ? 'wait' : 'pointer' } as object,
          pressed ? { opacity: 0.94, transform: [{ scale: 0.95 }] } : null,
        ]}
      >
        {showRing ? (
          <View
            pointerEvents="none"
            style={[styles.liveRing, { borderColor: theme.secondary.val }]}
          />
        ) : null}
        <SiriOrbWeb
          status={voice.status}
          reduceMotion={reduceMotion}
          isError={isError}
          errorColors={errorGradient}
          iconColor={theme.textInverse.val}
          pageVisible={pageVisible}
        />
        {connectedMuted ? (
          <View style={[styles.muteDot, { backgroundColor: theme.danger.val, borderColor: theme.textInverse.val }]} />
        ) : null}
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveRing: {
    position: 'absolute',
    width: ORB_SIZE + 14,
    height: ORB_SIZE + 14,
    borderRadius: (ORB_SIZE + 14) / 2,
    borderWidth: 2,
    opacity: 0.35,
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
  cardWrap: { position: 'absolute', width: CARD_WIDTH, zIndex: 59 },
})
