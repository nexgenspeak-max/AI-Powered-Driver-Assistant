// Continuous audio-amplitude values, updated ~60x/sec. Deliberately a plain
// mutable object (not React state / zustand) — read directly inside R3F's
// useFrame so avatar animation doesn't trigger React re-renders every frame.
export const audioLevels = {
  mic: 0,
  agent: 0,
}

let sharedAudioContext: AudioContext | null = null

function getAudioContext(): AudioContext {
  if (!sharedAudioContext) {
    sharedAudioContext = new AudioContext()
  }
  return sharedAudioContext
}

/**
 * Analyzes a raw MediaStreamTrack's volume (RMS) without touching whatever
 * element/graph is already playing it — safe to run alongside the existing
 * <audio> playback (attach()) without risking silencing it.
 */
export function analyzeTrack(track: MediaStreamTrack, onLevel: (rms: number) => void): () => void {
  const ctx = getAudioContext()
  const source = ctx.createMediaStreamSource(new MediaStream([track]))
  const analyser = ctx.createAnalyser()
  analyser.fftSize = 256
  source.connect(analyser)

  const data = new Uint8Array(analyser.frequencyBinCount)
  let rafId: number

  const tick = () => {
    analyser.getByteTimeDomainData(data)
    let sumSquares = 0
    for (let i = 0; i < data.length; i++) {
      const centered = (data[i] - 128) / 128
      sumSquares += centered * centered
    }
    onLevel(Math.sqrt(sumSquares / data.length))
    rafId = requestAnimationFrame(tick)
  }
  rafId = requestAnimationFrame(tick)

  return () => {
    cancelAnimationFrame(rafId)
    source.disconnect()
  }
}
