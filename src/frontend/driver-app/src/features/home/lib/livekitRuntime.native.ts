import { registerGlobals, AudioSession, AndroidAudioTypePresets } from '@livekit/react-native'

let globalsRegistered = false

function ensureLiveKitGlobals() {
  if (globalsRegistered) return
  // Must run once before any Room is created — sets up WebRTC globals.
  registerGlobals()
  globalsRegistered = true
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export { Room, RoomEvent, Track, ConnectionState, ConnectionError, ConnectionErrorReason } from 'livekit-client'

/**
 * Known-good iOS config (verified ~18:59 2026-09-05 with filler + spoken STT).
 * Keep `mixWithOthers` — removing it was a regression guess and did not fix
 * silent mic; the working session used this category options set.
 */
async function configureAndStart(): Promise<void> {
  ensureLiveKitGlobals()
  // Force speaker output on both platforms — this is a hands-free driving
  // assistant, not a phone call held to the ear. Without this, iOS's default
  // audio routing for a `playAndRecord`/voice-chat session favors the
  // earpiece, and the AI's voice once connected would play too quietly for a
  // driver to notice. Must be called before `startAudioSession()` for the
  // config to apply.
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

/**
 * Never throw — iOS often rejects stop when the session was never started or
 * expo-audio already released it ("Session deactivation failed"). Callers
 * (disconnect, connect catch) must not surface that as an uncaught rejection.
 */
export async function stopAudioSession() {
  try {
    await AudioSession.stopAudioSession()
  } catch {
    // ignore
  }
}

/**
 * Start LiveKit audio. Do **not** preemptively stop first — that caused
 * OSStatus -50 / "Session deactivation failed" and correlated with silent
 * mic after ~19:05 2026-09-05. On start failure only: soft-stop, settle, retry once.
 */
export async function startAudioSession() {
  try {
    await configureAndStart()
  } catch {
    await stopAudioSession()
    await sleep(200)
    await configureAndStart()
  }
}
