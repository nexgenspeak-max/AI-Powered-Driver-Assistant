import { useCallback, useRef, useState } from 'react'
import { Room, RoomEvent, Track } from 'livekit-client'
import { voiceService } from '../../../services/api/voice'

export type VoiceSessionStatus = 'idle' | 'connecting' | 'connected' | 'error'
export type VoiceMessageSource = 'user' | 'agent'

// LiveKit's documented default topic for text chat alongside a voice session.
// If the deployed livekit-agents version uses a different topic, adjust both here.
const CHAT_TOPIC = 'lk.chat'
const TRANSCRIPTION_TOPIC = 'lk.transcription'

export function useVoiceSession(onMessage?: (text: string, from: VoiceMessageSource) => void) {
  const [status, setStatus] = useState<VoiceSessionStatus>('idle')
  const roomRef = useRef<Room | null>(null)
  const audioElRef = useRef<HTMLAudioElement | null>(null)

  const connect = useCallback(async (driverPhone: string) => {
    if (roomRef.current) return

    setStatus('connecting')
    try {
      const { token, livekit_url } = await voiceService.getDriverToken(driverPhone)
      const room = new Room()
      roomRef.current = room

      room.on(RoomEvent.TrackSubscribed, (track) => {
        if (track.kind !== Track.Kind.Audio) return
        const audioEl = track.attach()
        audioElRef.current = audioEl
        document.body.appendChild(audioEl)
      })

      room.on(RoomEvent.Disconnected, () => {
        roomRef.current = null
        audioElRef.current?.remove()
        audioElRef.current = null
        setStatus('idle')
      })

      if (onMessage) {
        // Both the driver's own speech-to-text and the agent's replies arrive on
        // the same topics — distinguish by participant identity, not by topic.
        const handleStream = async (reader: Parameters<Parameters<Room['registerTextStreamHandler']>[1]>[0], participantInfo: { identity: string }) => {
          const text = await reader.readAll()
          if (!text.trim()) return
          const from: VoiceMessageSource = participantInfo.identity === room.localParticipant.identity ? 'user' : 'agent'
          onMessage(text, from)
        }
        room.registerTextStreamHandler(TRANSCRIPTION_TOPIC, handleStream)
        room.registerTextStreamHandler(CHAT_TOPIC, handleStream)
      }

      await room.connect(livekit_url, token)
      await room.localParticipant.setMicrophoneEnabled(true)
      setStatus('connected')
    } catch (err) {
      console.error('[voice-session] connect failed', err)
      roomRef.current?.disconnect()
      roomRef.current = null
      setStatus('error')
    }
  }, [onMessage])

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
