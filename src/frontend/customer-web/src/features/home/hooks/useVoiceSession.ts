import { useCallback, useRef, useState } from 'react'
import { Room, RoomEvent, Track } from 'livekit-client'
import { voiceService } from '../../../services/api/voice'
import { audioLevels, analyzeTrack } from '../state/audioLevels'
import { useAssistantAnimStore } from '../stores/assistantAnimStore'
import { detectEmotion } from '../utils/emotion'

export type VoiceSessionStatus = 'idle' | 'connecting' | 'connected' | 'error'

// LiveKit's documented default topic for text chat alongside a voice session.
// If the deployed livekit-agents version uses a different topic, adjust both here.
const CHAT_TOPIC = 'lk.chat'
const TRANSCRIPTION_TOPIC = 'lk.transcription'

export type VoiceMessageSource = 'user' | 'agent'

// RMS thresholds distinguishing "silence" from "someone is actually talking".
// Tuned for typical mic/speech levels — adjust if speaking/listening states
// feel too sticky or too twitchy in practice.
const MIC_THRESHOLD = 0.02
const AGENT_THRESHOLD = 0.02

export function useVoiceSession(onMessage?: (text: string, from: VoiceMessageSource) => void) {
  const [status, setStatus] = useState<VoiceSessionStatus>('idle')
  const roomRef = useRef<Room | null>(null)
  const audioElsRef = useRef<Set<HTMLAudioElement>>(new Set())
  const stopAnalyzersRef = useRef<Array<() => void>>([])
  const stateIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stopAudioAnalysis = useCallback(() => {
    stopAnalyzersRef.current.forEach(stop => stop())
    stopAnalyzersRef.current = []
    if (stateIntervalRef.current) {
      clearInterval(stateIntervalRef.current)
      stateIntervalRef.current = null
    }
    audioLevels.mic = 0
    audioLevels.agent = 0
    useAssistantAnimStore.getState().setState('idle')
  }, [])

  const startStateMachine = useCallback(() => {
    let wasListening = false
    stateIntervalRef.current = setInterval(() => {
      const { setState } = useAssistantAnimStore.getState()
      const speaking = audioLevels.agent > AGENT_THRESHOLD
      const listening = !speaking && audioLevels.mic > MIC_THRESHOLD

      if (speaking) {
        setState('speaking')
        wasListening = false
      } else if (listening) {
        setState('listening')
        wasListening = true
      } else if (wasListening) {
        setState('thinking')
      } else {
        setState('idle')
      }
    }, 150)
  }, [])

  const connect = useCallback(async (customerPhone: string) => {
    if (roomRef.current) return

    setStatus('connecting')
    try {
      const { token, livekit_url } = await voiceService.getCustomerToken(customerPhone)
      const room = new Room()
      roomRef.current = room

      room.on(RoomEvent.TrackSubscribed, (track) => {
        if (track.kind !== Track.Kind.Audio) return
        const audioEl = track.attach()
        audioElsRef.current.add(audioEl)
        document.body.appendChild(audioEl)
        stopAnalyzersRef.current.push(
          analyzeTrack(track.mediaStreamTrack, rms => { audioLevels.agent = rms }),
        )
      })

      room.on(RoomEvent.TrackUnsubscribed, (track) => {
        if (track.kind !== Track.Kind.Audio) return
        // A track can be attached to multiple elements; detach() with no args
        // returns and detaches all of them so a stale track never keeps playing.
        track.detach().forEach(el => {
          audioElsRef.current.delete(el)
          el.remove()
        })
      })

      room.on(RoomEvent.Disconnected, () => {
        roomRef.current = null
        audioElsRef.current.forEach(el => el.remove())
        audioElsRef.current.clear()
        stopAudioAnalysis()
        setStatus('idle')
      })

      if (onMessage) {
        // Both the customer's own speech-to-text and the agent's replies arrive on
        // the same topics — distinguish by participant identity, not by topic.
        const handleStream = async (reader: Parameters<Parameters<Room['registerTextStreamHandler']>[1]>[0], participantInfo: { identity: string }) => {
          const text = await reader.readAll()
          if (!text.trim()) return
          const from: VoiceMessageSource = participantInfo.identity === room.localParticipant.identity ? 'user' : 'agent'
          onMessage(text, from)
          if (from === 'agent') {
            useAssistantAnimStore.getState().setEmotion(detectEmotion(text))
          }
        }
        room.registerTextStreamHandler(TRANSCRIPTION_TOPIC, handleStream)
        room.registerTextStreamHandler(CHAT_TOPIC, handleStream)
      }

      await room.connect(livekit_url, token)
      await room.localParticipant.setMicrophoneEnabled(true)

      const micTrack = room.localParticipant.getTrackPublication(Track.Source.Microphone)?.track
      if (micTrack) {
        stopAnalyzersRef.current.push(
          analyzeTrack(micTrack.mediaStreamTrack, rms => { audioLevels.mic = rms }),
        )
      }
      startStateMachine()

      setStatus('connected')
    } catch (err) {
      console.error('[voice-session] connect failed', err)
      roomRef.current?.disconnect()
      roomRef.current = null
      setStatus('error')
    }
  }, [onMessage, startStateMachine, stopAudioAnalysis])

  const disconnect = useCallback(() => {
    roomRef.current?.disconnect()
  }, [])

  const sendText = useCallback(async (text: string) => {
    if (!roomRef.current || status !== 'connected') return false
    await roomRef.current.localParticipant.sendText(text, { topic: CHAT_TOPIC })
    return true
  }, [status])

  return { status, connect, disconnect, sendText }
}
