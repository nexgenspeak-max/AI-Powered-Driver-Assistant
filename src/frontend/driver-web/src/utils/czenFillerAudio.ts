let connectingAudio: HTMLAudioElement | null = null
let disconnectingAudio: HTMLAudioElement | null = null

function getConnecting(): HTMLAudioElement {
  if (!connectingAudio) {
    connectingAudio = new Audio('/audio/connecting-czen.mp3')
    connectingAudio.preload = 'auto'
  }
  return connectingAudio
}

function getDisconnecting(): HTMLAudioElement {
  if (!disconnectingAudio) {
    disconnectingAudio = new Audio('/audio/disconnecting-czen.mp3')
    disconnectingAudio.preload = 'auto'
  }
  return disconnectingAudio
}

export function preloadCzenFillers(): void {
  getConnecting().load()
  getDisconnecting().load()
}

export function playConnectingFiller(): void {
  try {
    const a = getConnecting()
    a.currentTime = 0
    void a.play()
  } catch {
    // autoplay blocked — ignore
  }
}

export function stopConnectingFiller(): void {
  const a = connectingAudio
  if (!a) return
  a.pause()
  a.currentTime = 0
}

export async function playDisconnectingFiller(): Promise<void> {
  try {
    const a = getDisconnecting()
    a.currentTime = 0
    await a.play()
  } catch {
    // ignore
  }
}
