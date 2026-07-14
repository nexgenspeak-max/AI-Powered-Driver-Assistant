import { create } from 'zustand'
import { Room, RoomEvent, Track } from 'livekit-client'
import { voiceService } from '../../../services/api/voice'

export type VoiceSessionStatus = 'idle' | 'connecting' | 'connected' | 'error'
export type VoiceMessageSource = 'user' | 'agent'
export type VoiceMessageListener = (text: string, from: VoiceMessageSource) => void

// LiveKit's documented default topic for text chat alongside a voice session.
// If the deployed livekit-agents version uses a different topic, adjust both here.
const CHAT_TOPIC = 'lk.chat'
const TRANSCRIPTION_TOPIC = 'lk.transcription'

// Module-level (not React state) so the LiveKit session survives page
// navigation — only the store's `status` needs to be reactive.
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
      const { token, livekit_url } = await voiceService.getDriverToken(driverPhone)
      const r = new Room()
      room = r

      r.on(RoomEvent.TrackSubscribed, (track) => {
        if (track.kind !== Track.Kind.Audio) return
        const audioEl = track.attach()
        audioEls.add(audioEl)
        document.body.appendChild(audioEl)
      })

      r.on(RoomEvent.TrackUnsubscribed, (track) => {
        if (track.kind !== Track.Kind.Audio) return
        // A track can be attached to multiple elements; detach() with no args
        // returns and detaches all of them so a stale track never keeps playing.
        track.detach().forEach(el => {
          audioEls.delete(el)
          el.remove()
        })
      })

      r.on(RoomEvent.Disconnected, () => {
        room = null
        audioEls.forEach(el => el.remove())
        audioEls.clear()
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
