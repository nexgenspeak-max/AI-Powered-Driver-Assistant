/**
 * Instant connect filler — pre-rendered MP3 from voice-agent Google TTS
 * (scripts/generate_connecting_filler.py). Same voice/rate/pitch as backend Czen.
 */
import { AudioModule, setAudioModeAsync } from "expo-audio";

const CONNECTING_CZEN_ASSET = require("../../../../assets/audio/connecting-czen.mp3");

let player: InstanceType<typeof AudioModule.AudioPlayer> | null = null;

function getPlayer(): InstanceType<typeof AudioModule.AudioPlayer> {
  if (!player) {
    player = new AudioModule.AudioPlayer(CONNECTING_CZEN_ASSET, 500, false);
  }
  return player;
}

export async function playConnectingFiller(): Promise<void> {
  try {
    await setAudioModeAsync({
      playsInSilentMode: true,
      interruptionMode: "mixWithOthers",
    });
    const p = getPlayer();
    p.pause();
    if (p.currentTime !== 0) {
      await p.seekTo(0);
    }
    p.loop = false;
    p.volume = 1;
    p.play();
  } catch (err) {
    console.warn("[connecting-filler] play failed", err);
  }
}

export function stopConnectingFiller(): void {
  if (!player) return;
  try {
    player.pause();
  } catch {
    // ignore teardown races
  }
}
