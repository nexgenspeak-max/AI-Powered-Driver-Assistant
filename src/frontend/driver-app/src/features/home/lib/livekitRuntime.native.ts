import { registerGlobals, AudioSession } from '@livekit/react-native'

// Must run once before any Room is created — sets up the WebRTC globals
// (RTCPeerConnection, MediaStream, ...) that livekit-client expects.
registerGlobals()

export { Room, RoomEvent, Track } from 'livekit-client'

export async function startAudioSession() {
  await AudioSession.startAudioSession()
}

export async function stopAudioSession() {
  await AudioSession.stopAudioSession()
}
