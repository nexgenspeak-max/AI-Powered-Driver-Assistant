import { create } from 'zustand'
import { Room, RoomEvent, Track } from 'livekit-client'
import { voiceService } from '../../../services/api/voice'
import { audioLevels, analyzeTrack } from '../state/audioLevels'
import { useAssistantAnimStore } from './assistantAnimStore'
import { detectEmotion } from '../utils/emotion'

export type VoiceSessionStatus = 'idle' | 'connecting' | 'connected' | 'error'
export type VoiceMessageSource = 'user' | 'agent'
export type VoiceMessageListener = (text: string, from: VoiceMessageSource) => void

// LiveKit's documented default topic for text chat alongside a voice session.
// If the deployed livekit-agents version uses a different topic, adjust both here.
const CHAT_TOPIC = 'lk.chat'
const TRANSCRIPTION_TOPIC = 'lk.transcription'

// RMS thresholds distinguishing "silence" from "someone is actually talking".
// Tuned for typical mic/speech levels — adjust if speaking/listening states
// feel too sticky or too twitchy in practice.
const MIC_THRESHOLD = 0.02
const AGENT_THRESHOLD = 0.02

// Module-level (not React state) so the LiveKit session survives page
// navigation — only the store's `status` needs to be reactive.
let room: Room | null = null
const audioEls = new Set<HTMLAudioElement>()
const messageListeners = new Set<VoiceMessageListener>()
let stopAnalyzers: Array<() => void> = []
let stateInterval: ReturnType<typeof setInterval> | null = null

function stopAudioAnalysis() {
  stopAnalyzers.forEach(stop => stop())
  stopAnalyzers = []
  if (stateInterval) {
    clearInterval(stateInterval)
    stateInterval = null
  }
  audioLevels.mic = 0
  audioLevels.agent = 0
  useAssistantAnimStore.getState().setState('idle')
}

function startStateMachine() {
  let wasListening = false
  stateInterval = setInterval(() => {
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
}

interface VoiceSessionState {
  status: VoiceSessionStatus
  connect: (customerPhone: string) => Promise<void>
  disconnect: () => void
  sendText: (text: string) => Promise<boolean>
}

export const useVoiceSessionStore = create<VoiceSessionState>((set, get) => ({
  status: 'idle',

  connect: async (customerPhone: string) => {
    if (room) return

    set({ status: 'connecting' })
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
        set({ status: 'idle' })
      })

      // Both the customer's own speech-to-text and the agent's replies arrive on
      // the same topics — distinguish by participant identity, not by topic.
      const handleStream = async (reader: Parameters<Parameters<Room['registerTextStreamHandler']>[1]>[0], participantInfo: { identity: string }) => {
        const text = await reader.readAll()
        // TEMP DEBUG (remove once FEAT-010 chat-text investigation is done) — logs every
        // lk.chat/lk.transcription message so we can see in DevTools whether the agent's
        // reply ever arrives, and if so, under what identity/topic.
        console.debug('[voice-session] stream message', { identity: participantInfo.identity, localIdentity: r.localParticipant.identity, textLength: text.length, text })
        if (!text.trim()) return
        const from: VoiceMessageSource = participantInfo.identity === r.localParticipant.identity ? 'user' : 'agent'
        // TEMP DEBUG (remove once FEAT-010 chat-text investigation is done)
        console.debug('[voice-session] dispatching to listeners', { listenerCount: messageListeners.size, from })
        messageListeners.forEach(listener => listener(text, from))
        if (from === 'agent') {
          useAssistantAnimStore.getState().setEmotion(detectEmotion(text))
        }
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
      startStateMachine()

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
