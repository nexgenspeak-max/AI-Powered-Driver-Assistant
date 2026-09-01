import { create } from 'zustand'
import { Room, RoomEvent, Track } from 'livekit-client'
import { voiceService } from '../../../services/api/voice'
import { audioLevels, analyzeTrack } from '../state/audioLevels'
import {
  playConnectingFiller,
  playDisconnectingFiller,
  stopConnectingFiller,
} from '../../../utils/czenFillerAudio'

export type VoiceSessionStatus = 'idle' | 'connecting' | 'connected' | 'error'
export type VoiceMessageSource = 'user' | 'agent'
export type VoiceTranscriptMeta = { isFinal: boolean; segmentId?: string }
export type VoiceMessageListener = (text: string, from: VoiceMessageSource, meta: VoiceTranscriptMeta) => void

const CHAT_TOPIC = 'lk.chat'
const TRANSCRIPTION_TOPIC = 'lk.transcription'
const TRANSCRIPTION_FINAL_ATTR = 'lk.transcription_final'
const SEGMENT_ID_ATTR = 'lk.segment_id'

function transcriptDedupKey(from: VoiceMessageSource, text: string): string {
  return `${from}:${text.trim().replace(/\s+/g, ' ').replace(/[.!?…]+$/u, '').toLowerCase()}`
}

function isFinalTranscriptStream(reader: {
  info: { topic: string; attributes?: Record<string, string> }
}): boolean {
  if (reader.info.topic !== TRANSCRIPTION_TOPIC) return true
  return reader.info.attributes?.[TRANSCRIPTION_FINAL_ATTR] !== 'false'
}

// Module-level (not React state) so the LiveKit session survives page
// navigation — only the store's `status` needs to be reactive.
let room: Room | null = null
const audioEls = new Set<HTMLAudioElement>()
const messageListeners = new Set<VoiceMessageListener>()
let stopAnalyzers: Array<() => void> = []
let pendingUserDisconnectFiller = false

function stopAudioAnalysis() {
  stopAnalyzers.forEach(stop => stop())
  stopAnalyzers = []
  audioLevels.mic = 0
  audioLevels.agent = 0
}

interface VoiceSessionState {
  status: VoiceSessionStatus
  connect: (customerPhone: string) => Promise<void>
  disconnect: (opts?: { userInitiated?: boolean }) => void
  sendText: (text: string) => Promise<boolean>
}

export const useVoiceSessionStore = create<VoiceSessionState>((set, get) => ({
  status: 'idle',

  connect: async (customerPhone: string) => {
    if (room) return

    set({ status: 'connecting' })
    stopConnectingFiller()
    playConnectingFiller()
    try {
      const { token, livekit_url } = await voiceService.getCustomerToken(customerPhone)
      const r = new Room()
      room = r

      r.on(RoomEvent.TrackSubscribed, (track) => {
        if (track.kind !== Track.Kind.Audio) return
        const audioEl = track.attach()
        audioEls.add(audioEl)
        document.body.appendChild(audioEl)
        stopAnalyzers.push(
          analyzeTrack(track.mediaStreamTrack, rms => { audioLevels.agent = rms }),
        )
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
        stopAudioAnalysis()
        stopConnectingFiller()
        set({ status: 'idle' })
        if (pendingUserDisconnectFiller) {
          pendingUserDisconnectFiller = false
          void playDisconnectingFiller()
        }
      })

      // Both the customer's own speech-to-text and the agent's replies arrive on
      // the same topics — distinguish by participant identity, not by topic.
      const recentMessages = new Map<string, number>()
      const handleStream = async (reader: Parameters<Parameters<Room['registerTextStreamHandler']>[1]>[0], participantInfo: { identity: string }) => {
        const from: VoiceMessageSource = participantInfo.identity === r.localParticipant.identity ? 'user' : 'agent'
        const segmentId = reader.info.attributes?.[SEGMENT_ID_ATTR]
        const emit = (text: string, isFinal: boolean) => {
          if (!text.trim()) return
          if (isFinal) {
            const messageKey = transcriptDedupKey(from, text)
            const now = Date.now()
            const previousTimestamp = recentMessages.get(messageKey)
            if (previousTimestamp && now - previousTimestamp < 3000) return
            recentMessages.set(messageKey, now)
            for (const [key, timestamp] of recentMessages) {
              if (now - timestamp >= 3000) recentMessages.delete(key)
            }
          }
          messageListeners.forEach(listener => listener(text, from, { isFinal, segmentId }))
        }
        if (reader.info.topic !== TRANSCRIPTION_TOPIC) {
          emit(await reader.readAll(), true)
          return
        }
        let text = ''
        for await (const chunk of reader) {
          text += chunk
          emit(text, false)
        }
        emit(text, isFinalTranscriptStream(reader))
      }
      r.registerTextStreamHandler(TRANSCRIPTION_TOPIC, handleStream)
      r.registerTextStreamHandler(CHAT_TOPIC, handleStream)

      await r.connect(livekit_url, token)
      await r.localParticipant.setMicrophoneEnabled(true)

      const micTrack = r.localParticipant.getTrackPublication(Track.Source.Microphone)?.track
      if (micTrack) {
        stopAnalyzers.push(
          analyzeTrack(micTrack.mediaStreamTrack, rms => { audioLevels.mic = rms }),
        )
      }

      set({ status: 'connected' })
      stopConnectingFiller()
    } catch (err) {
      console.error('[voice-session] connect failed', err)
      room?.disconnect()
      room = null
      stopConnectingFiller()
      set({ status: 'error' })
    }
  },

  disconnect: (opts?: { userInitiated?: boolean }) => {
    const { status } = get()
    pendingUserDisconnectFiller = !!(
      opts?.userInitiated &&
      (status === 'connected' || status === 'connecting')
    )
    stopConnectingFiller()
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
