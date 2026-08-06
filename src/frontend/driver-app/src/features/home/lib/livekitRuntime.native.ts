import { registerGlobals, AudioSession, AndroidAudioTypePresets } from '@livekit/react-native'

// Must run once before any Room is created — sets up the WebRTC globals
// (RTCPeerConnection, MediaStream, ...) that livekit-client expects.
registerGlobals()

export { Room, RoomEvent, Track, ConnectionState, ConnectionError, ConnectionErrorReason } from 'livekit-client'

export async function startAudioSession() {
  // Force speaker output on both platforms — this is a hands-free driving
  // assistant, not a phone call held to the ear. Without this, iOS's default
  // audio routing for a `playAndRecord`/voice-chat session favors the
  // earpiece, and the connecting-cue audio (AssistantChatPanel.tsx) and the
  // AI's own voice once connected would play too quietly for a driver to
  // notice. Must be called before `startAudioSession()` for the config to
  // apply.
  await AudioSession.configureAudio({
    ios: { defaultOutput: 'speaker' },
    android: {
      audioTypeOptions: {
        ...AndroidAudioTypePresets.communication,
        // The preset's default ('gain') requests EXCLUSIVE audio focus —
        // Android then stops/silences any other audio source outright the
        // instant this session activates, which is why the connecting-cue
        // player (started moments earlier, right as `status` flips to
        // 'connecting') never actually made a sound. 'gainTransientMayDuck'
        // only asks other sources to lower their volume instead, so the cue
        // keeps playing underneath instead of getting cut off.
        audioFocusMode: 'gainTransientMayDuck',
      },
    },
  })
  // iOS equivalent of the Android fix above — without `mixWithOthers`,
  // activating this playAndRecord/voiceChat session stops any other
  // currently-playing audio in the app (same silencing effect).
  await AudioSession.setAppleAudioConfiguration({
    audioCategory: 'playAndRecord',
    audioMode: 'voiceChat',
    audioCategoryOptions: ['mixWithOthers', 'defaultToSpeaker', 'allowBluetooth'],
  })
  await AudioSession.startAudioSession()
}

export async function stopAudioSession() {
  await AudioSession.stopAudioSession()
}
