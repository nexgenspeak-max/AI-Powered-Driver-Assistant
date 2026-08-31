/**
 * Instant connect/disconnect fillers — pre-rendered MP3 from voice-agent Google TTS
 * (voice-agent/scripts/generate_czen_fillers.py). Same voice/rate as backend Czen.
 *
 * iOS: never call setAudioModeAsync while LiveKit playAndRecord is active — it breaks
 * mic capture (STT audio_duration_ms=0) and agent TTS routing. Connect cue plays during
 * token fetch, then fades out before startAudioSession(); disconnect cue plays after
 * stopAudioSession() with fade-in/out to avoid AVAudioSession pops ("tích").
 */
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from "expo-audio";

const CONNECTING_ASSET = require("../../../../assets/audio/connecting-czen.mp3");
const DISCONNECTING_ASSET = require("../../../../assets/audio/disconnecting-czen.mp3");

const CONNECTING_FALLBACK_MS = 3200;
const DISCONNECTING_FALLBACK_MS = 2500;
const FADE_MS = 100;
const FADE_STEPS = 5;
/** Brief pause after connect filler fade so iOS AVAudioSession can settle before LiveKit. */
const HANDOFF_SETTLE_MS = 40;

type Player = AudioPlayer;

let connectingPlayer: Player | null = null;
let disconnectingPlayer: Player | null = null;
let preloadPromise: Promise<void> | null = null;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fadeVolume(player: Player, from: number, to: number): Promise<void> {
  const stepMs = FADE_MS / FADE_STEPS;
  for (let i = 1; i <= FADE_STEPS; i += 1) {
    player.volume = from + (to - from) * (i / FADE_STEPS);
    await sleep(stepMs);
  }
}

async function getOrCreatePlayer(
  assetModule: number,
  getCached: () => Player | null,
  setCached: (p: Player) => void,
): Promise<Player> {
  const cached = getCached();
  if (cached) return cached;
  const player = createAudioPlayer(assetModule, {
    downloadFirst: true,
    keepAudioSessionActive: false,
  });
  setCached(player);
  return player;
}

async function ensurePlaybackAudioMode(): Promise<void> {
  await setAudioModeAsync({
    playsInSilentMode: true,
    interruptionMode: "mixWithOthers",
  });
}

async function waitForPlayback(player: Player, fallbackMs: number): Promise<void> {
  for (let i = 0; i < 40; i += 1) {
    if (player.duration > 0) break;
    await sleep(50);
  }
  const durationMs =
    player.duration > 0 ? Math.ceil(player.duration * 1000) + 150 : fallbackMs;
  await sleep(durationMs);
}

async function fadeOutAndStop(
  p: Player | null,
  opts: { remove?: boolean } = {},
): Promise<void> {
  if (!p) return;
  try {
    const startVol = p.volume ?? 1;
    if (startVol > 0.02) {
      await fadeVolume(p, startVol, 0);
    }
    p.pause();
    p.volume = 1;
    if (opts.remove) {
      p.remove();
    }
  } catch {
    try {
      p.pause();
      p.volume = 1;
    } catch {
      // ignore teardown races
    }
  }
}

async function startAssetPlayback(
  assetModule: number,
  getCached: () => Player | null,
  setCached: (p: Player) => void,
  configureAudioMode: boolean,
): Promise<Player> {
  // Connect filler runs before LiveKit — skip setAudioModeAsync (sets allowsRecording=false
  // on iOS and mic uplink stays dead after handoff). Disconnect runs after stopAudioSession().
  if (configureAudioMode) {
    await ensurePlaybackAudioMode();
  }
  const player = await getOrCreatePlayer(assetModule, getCached, setCached);
  player.pause();
  if (player.currentTime !== 0) {
    await player.seekTo(0);
  }
  player.loop = false;
  player.volume = 0;
  player.play();
  await fadeVolume(player, 0, 1);
  return player;
}

/** Fade out connect filler once, then release player before LiveKit startAudioSession(). */
export async function handoffConnectingFillerForLiveKit(): Promise<void> {
  const p = connectingPlayer;
  connectingPlayer = null;
  await fadeOutAndStop(p, { remove: true });
  await sleep(HANDOFF_SETTLE_MS);
}

/** @deprecated Use handoffConnectingFillerForLiveKit — kept for call-site clarity during migration. */
export const releaseFillerAudioForLiveKit = handoffConnectingFillerForLiveKit;

function pausePlayer(p: Player | null) {
  if (!p) return;
  try {
    p.pause();
    p.volume = 1;
  } catch {
    // ignore teardown races
  }
}

/** Warm MP3 decode so connect filler plays on the first tap, not after download. */
export function preloadCzenFillers(): void {
  if (preloadPromise) return;
  preloadPromise = Promise.all([
    getOrCreatePlayer(
      CONNECTING_ASSET,
      () => connectingPlayer,
      (p) => {
        connectingPlayer = p;
      },
    ),
    getOrCreatePlayer(
      DISCONNECTING_ASSET,
      () => disconnectingPlayer,
      (p) => {
        disconnectingPlayer = p;
      },
    ),
  ]).then(() => {});
}

/** Plays during token fetch — hand off before LiveKit startAudioSession(). */
export async function playConnectingFiller(): Promise<void> {
  await fadeOutAndStop(disconnectingPlayer, { remove: false });
  try {
    await startAssetPlayback(
      CONNECTING_ASSET,
      () => connectingPlayer,
      (p) => {
        connectingPlayer = p;
      },
      false,
    );
  } catch (err) {
    console.warn("[czen-filler] play failed", err);
  }
}

/** After LiveKit teardown — playback-only, fade in/out, await full clip. */
export async function playDisconnectingFiller(): Promise<void> {
  await fadeOutAndStop(connectingPlayer, { remove: false });
  try {
    const player = await startAssetPlayback(
      DISCONNECTING_ASSET,
      () => disconnectingPlayer,
      (p) => {
        disconnectingPlayer = p;
      },
      true,
    );
    await waitForPlayback(player, DISCONNECTING_FALLBACK_MS);
    await fadeOutAndStop(player, { remove: false });
  } catch (err) {
    console.warn("[czen-filler] play failed", err);
  }
}

/** Cancel connect filler — fade out to avoid session pop on abrupt pause. */
export function stopConnectingFiller(): void {
  void fadeOutAndStop(connectingPlayer, { remove: false });
}

export function stopDisconnectingFiller(): void {
  void fadeOutAndStop(disconnectingPlayer, { remove: false });
}
