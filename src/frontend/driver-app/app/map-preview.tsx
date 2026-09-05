import { useEffect, useState } from 'react'
import { LayoutChangeEvent, StyleSheet, View, Text } from 'react-native'
import { Redirect, useLocalSearchParams } from 'expo-router'
import { DriverMap } from '../src/features/home/components/DriverMap'
import { AssistantTabButton } from '../src/components/AssistantTabButton'
import {
  useVoiceSessionStore,
  type VoiceSessionStatus,
} from '../src/features/home/stores/voiceSessionStore'

const PREVIEW_STATUSES = new Set<VoiceSessionStatus>(['idle', 'connecting', 'connected', 'error'])

function firstParam(v: string | string[] | undefined): string {
  if (Array.isArray(v)) return v[0] ?? ''
  return v ?? ''
}

/** Ungated map so agents can verify tiles/markers/orb on Expo web without a phone or login.
 *  Query: `?orb=idle|connecting|connected|error`, `?muted=1`, `?speak=1` (connected waves from audio).
 */
export default function MapPreviewScreen() {
  const [barWidth, setBarWidth] = useState(0)
  const params = useLocalSearchParams<{ orb?: string | string[]; muted?: string | string[]; speak?: string | string[] }>()

  useEffect(() => {
    const raw = firstParam(params.orb)
    const status: VoiceSessionStatus = PREVIEW_STATUSES.has(raw as VoiceSessionStatus)
      ? (raw as VoiceSessionStatus)
      : 'idle'
    const muted = ['1', 'true'].includes(firstParam(params.muted))
    const speaking = ['1', 'true'].includes(firstParam(params.speak))
    useVoiceSessionStore.setState({
      status,
      isMicMuted: muted && status === 'connected',
      agentSpeaking: speaking && status === 'connected',
      agentAudioLevel: speaking && status === 'connected' ? 0.45 : 0,
    })
    return () => {
      useVoiceSessionStore.setState({
        status: 'idle',
        isMicMuted: false,
        agentSpeaking: false,
        agentAudioLevel: 0,
      })
    }
  }, [params.orb, params.muted, params.speak])

  // Production: send visitors to auth Landing (not bare `/`, which used to
  // fall through to this same ungated preview when it was first in the Stack).
  if (!__DEV__) {
    return <Redirect href="/(auth)" />
  }

  return (
    <View style={StyleSheet.absoluteFill}>
      <DriverMap />
      <View style={styles.banner} pointerEvents="none">
        <Text style={styles.bannerText}>DEV map preview · no login</Text>
      </View>
      <View
        style={styles.orbSlot}
        pointerEvents="box-none"
        onLayout={(e: LayoutChangeEvent) => setBarWidth(e.nativeEvent.layout.width)}
      >
        {barWidth > 0 ? <AssistantTabButton centerX={barWidth / 2} barWidth={barWidth} /> : null}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 12,
    alignSelf: 'center',
    left: 16,
    right: 16,
    alignItems: 'center',
  },
  bannerText: {
    backgroundColor: 'rgba(15,23,42,0.75)',
    color: '#f8fafc',
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    overflow: 'hidden',
  },
  orbSlot: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 16,
    height: 72,
  },
})
