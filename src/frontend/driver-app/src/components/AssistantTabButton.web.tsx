/**
 * AssistantTabButton.web — lightweight purple orb. Static when idle; one CSS spin
 * only while connecting/connected. No filter:blur / mix-blend-mode (CPU hogs).
 */
import { useEffect, useState } from 'react'
import { LayoutChangeEvent, Pressable, StyleSheet, View } from 'react-native'
import { AppText } from './AppText'
import { GlassMaterial } from './LiquidGlass'
import { AssistantOrbCenter } from './AssistantOrbCenter'
import {
  AssistantTabLabel,
  BUTTON_RISE,
  CARD_MARGIN,
  CARD_WIDTH,
  ORB_CONIC_A,
  ORB_SIZE,
  ORB_WRAP_WIDTH,
  SPIN_DURATION,
  useAssistantTabButton,
} from './assistantTabButtonShared'

export {
  AssistantTabLabel,
  BUTTON_LABEL_OVERHANG,
  BUTTON_RISE,
  BUTTON_SIZE,
  ORB_SIZE,
  ORB_WRAP_WIDTH,
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
  iconColor,
  pageVisible,
}: {
  status: keyof typeof SPIN_DURATION
  reduceMotion: boolean
  iconColor: string
  pageVisible: boolean
}) {
  // Always brand purple — never danger/red, even on error (retry still looks like Trợ lý).
  const spinActive = pageVisible && !reduceMotion && (status === 'connecting' || status === 'connected')
  const spinMs = SPIN_DURATION[status] || 10000

  const orbShellCss: WebCssViewStyle = {
    width: ORB_SIZE,
    height: ORB_SIZE,
    borderRadius: ORB_SIZE / 2,
    overflow: 'hidden',
    position: 'relative',
    boxShadow: '0 8px 28px rgba(124, 58, 237, 0.42), inset 0 1px 0 rgba(255,255,255,0.4)',
  }

  const fillCss: WebCssViewStyle = spinActive
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

export function AssistantTabButton({
  centerX,
  barWidth,
  showLabel = true,
}: {
  centerX: number
  barWidth: number
  /** Render the “Trợ lý AI” caption under the orb. Off for the docked
   *  Navigation Bar orb (M3 FAB has no label); on for the chat dock. */
  showLabel?: boolean
}) {
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
    accessibilityLabel,
    reduceMotion,
    connectedMuted,
    isConnecting,
  } = useAssistantTabButton()

  if (barWidth <= 0) return null

  const left = centerX - ORB_WRAP_WIDTH / 2
  const cardLeft = Math.min(Math.max(centerX - CARD_WIDTH / 2, CARD_MARGIN), barWidth - CARD_WIDTH - CARD_MARGIN)
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
            <AppText variant="caption" numberOfLines={4} color="$textPrimary" padding={10} textAlign="center">
              {expandedText}
            </AppText>
          </GlassMaterial>
        </View>
      ) : null}

      <Pressable
        onPress={handlePress}
        disabled={isConnecting}
        hitSlop={8}
        accessible
        accessibilityRole="button"
        accessibilityState={{ disabled: isConnecting, busy: isConnecting }}
        accessibilityLabel={accessibilityLabel}
        onAccessibilityTap={isConnecting ? undefined : handlePress}
        style={({ pressed }) => [
          styles.wrap,
          { left, top: -BUTTON_RISE },
          { cursor: isConnecting ? 'wait' : 'pointer' } as object,
          isConnecting ? { opacity: 0.72 } : null,
          !isConnecting && pressed ? { opacity: 0.94, transform: [{ scale: 0.97 }] } : null,
        ]}
      >
        <View style={styles.orbStack}>
          {showRing ? (
            <View pointerEvents="none" style={[styles.liveRing, { borderColor: theme.secondary.val }]} />
          ) : null}
          <SiriOrbWeb
            status={voice.status}
            reduceMotion={reduceMotion}
            iconColor={theme.textInverse.val}
            pageVisible={pageVisible}
          />
          {connectedMuted ? (
            <View style={[styles.muteDot, { backgroundColor: theme.danger.val, borderColor: theme.textInverse.val }]} />
          ) : null}
        </View>
        {showLabel ? (
          <View style={styles.labelSlot} pointerEvents="none">
            <AssistantTabLabel color={theme.textPrimary.val} connectingColor={theme.primary.val} />
          </View>
        ) : null}
      </Pressable>
    </>
  )
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    width: ORB_WRAP_WIDTH,
    zIndex: 60,
    alignItems: 'center',
  },
  orbStack: {
    width: ORB_SIZE,
    height: ORB_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelSlot: {
    marginTop: 4,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 14,
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
