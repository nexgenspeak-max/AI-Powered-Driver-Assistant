import { create } from 'zustand'
import { Platform } from 'react-native'
import { Room, RoomEvent, Track, startAudioSession, stopAudioSession } from '../lib/livekitRuntime'
import { voiceService } from '../../../services/api/voice'

export type VoiceSessionStatus = 'idle' | 'connecting' | 'connected' | 'error'
export type VoiceMessageSource = 'user' | 'agent'
export type VoiceMessageListener = (text: string, from: VoiceMessageSource) => void

const CHAT_TOPIC = 'lk.chat'
const TRANSCRIPTION_TOPIC = 'lk.transcription'

// Module-level (not React state) so the LiveKit session survives navigation
// between tabs — only the store's `status` needs to be reactive.
let room: Room | null = null
const audioEls = new Set<HTMLAudioElement>()
const messageListeners = new Set<VoiceMessageListener>()

interface VoiceSessionState {
  status: VoiceSessionStatus
  connect: (driverPhone: string) => Promise<void>
  disconnect: () => void
  sendText: (text: string) => Promise<boolean>
}

export const useVoiceSessionStore = create<VoiceSessionState>((set, get) => ({
  status: 'idle',

  connect: async (driverPhone: string) => {
    if (room) return

    set({ status: 'connecting' })
    try {
      await startAudioSession()
      const { token, livekit_url } = await voiceService.getDriverToken(driverPhone)
      const r = new Room()
      room = r

      r.on(RoomEvent.TrackSubscribed, track => {
        if (track.kind !== Track.Kind.Audio) return
        if (Platform.OS === 'web') {
          const audioEl = track.attach() as HTMLAudioElement
          audioEls.add(audioEl)
          document.body.appendChild(audioEl)
        }
        // Native: subscribed audio tracks play automatically through the
        // active AudioSession — no manual attach step needed.
      })

      r.on(RoomEvent.TrackUnsubscribed, track => {
        if (track.kind !== Track.Kind.Audio) return
        if (Platform.OS === 'web') {
          track.detach().forEach(el => {
            audioEls.delete(el as HTMLAudioElement)
            ;(el as HTMLAudioElement).remove()
          })
        }
      })

      r.on(RoomEvent.Disconnected, () => {
        room = null
        audioEls.forEach(el => el.remove())
        audioEls.clear()
        stopAudioSession()
        set({ status: 'idle' })
      })

      // Both the driver's own speech-to-text and the agent's replies arrive on
      // the same topics — distinguish by participant identity, not by topic.
      const handleStream = async (reader: Parameters<Parameters<Room['registerTextStreamHandler']>[1]>[0], participantInfo: { identity: string }) => {
        const text = await reader.readAll()
        if (!text.trim()) return
        const from: VoiceMessageSource = participantInfo.identity === r.localParticipant.identity ? 'user' : 'agent'
        messageListeners.forEach(listener => listener(text, from))
      }
      r.registerTextStreamHandler(TRANSCRIPTION_TOPIC, handleStream)
      r.registerTextStreamHandler(CHAT_TOPIC, handleStream)

      await r.connect(livekit_url, token)
      await r.localParticipant.setMicrophoneEnabled(true)
      set({ status: 'connected' })
    } catch (err) {
      console.error('[voice-session] connect failed', err)
      room?.disconnect()
      room = null
      stopAudioSession()
      set({ status: 'error' })
    }
  },

  disconnect: () => {
    room?.disconnect()
  },

  sendText: async (text: string) => {
    if (!room || get().status !== 'connected') return false
    await room.localParticipant.sendText(text, { topic: CHAT_TOPIC })
    return true
  },
}))

/** Subscribe to transcribed/chat messages from the active voice session. Returns an unsubscribe fn. */
export function subscribeVoiceMessages(listener: VoiceMessageListener): () => void {
  messageListeners.add(listener)
  return () => messageListeners.delete(listener)
}
