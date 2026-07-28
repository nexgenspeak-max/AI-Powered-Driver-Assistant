import { Platform, Linking } from "react-native";
import * as ExpoLinking from "expo-linking";
import ForegroundService from "@supersami/rn-foreground-service";
import * as Vosk from "react-native-vosk";
import { queryClient } from "../../providers/QueryProvider";
import { useVoiceSessionStore } from "../home/stores/voiceSessionStore";
import type { Driver } from "../../types";

// Model downloaded from https://alphacephei.com/vosk/models (Apache-2.0, no
// account needed) and unpacked into assets/model-en-us — see the
// "react-native-vosk" plugin entry in app.json for how it gets bundled.
// English-only now (vosk-model-small-en-us-0.15) — was Vietnamese
// (model-vi-vn); switched over entirely rather than trying to run both, per
// the tradeoffs around simultaneous/alternating dual-model recognition
// (mic contention, added latency) being worse than just picking one
// language for the wake phrase.
const MODEL_NAME = "model-en-us";

// Vosk's `grammar` option only matches reliably against words already in the
// model's dictionary. Re-tune after testing recognition on a real device.
const WAKE_PHRASES = ["hey ai"];

// Grammar-constrained decoding forces every utterance onto the closest entry
// in this list — with only WAKE_PHRASES and '[unk]' as options, any speech
// that isn't near-silence gets force-matched to a wake phrase, since it's
// the only real word available ('[unk]' only wins for actual noise/
// silence). These common English filler/greeting words give the decoder
// real alternatives to fall onto instead, so ordinary conversation stops
// getting misheard as the wake phrase.
const GRAMMAR_DECOY_WORDS = [
  "yes",
  "no",
  "okay",
  "sure",
  "yeah",
  "um",
  "uh",
  "hi",
  "hello",
  "thanks",
  "thank you",
  "bye",
  "goodbye",
  "what",
  "why",
  "how",
  "please",
  "sorry",
  "hey",
];

// Grammar-forced decoding always picks *some* entry from the list for any
// non-silent audio, including a cough or a door slam — the decoy words above
// give it somewhere else to land, but a short burst of noise can still
// happen to decode as WAKE_PHRASE by chance. Text matching alone can never
// fully rule that out, so this also gates on Vosk/Kaldi's own per-word
// confidence (0..1) — the native module (react-native-vosk, patched locally,
// see patches/react-native-vosk+2.1.7.patch) calls `setWords(true)` and
// reports the recognizer's actual acoustic+LM confidence alongside the text,
// instead of this module having to guess via timing/repetition heuristics.
// Confidence is only ever present on onResult/onFinalResult, never on
// partial hypotheses (Vosk doesn't compute it mid-utterance) — see
// onPartialResult below, which only logs and never triggers a match. Trades
// a bit of latency (waits for a completed utterance instead of reacting to
// the first partial) for near-elimination of false wakes.
const MIN_CONFIDENCE = 0.85;

type VoskHypothesis = { text: string; confidence: number | null };

// The patched native module emits a JSON string `{"text": "...",
// "confidence": number|null}` for every event, not plain text — falls back
// to treating the raw string as the text with unknown confidence if parsing
// ever fails, rather than dropping a real event.
function parseVoskEvent(raw: string): VoskHypothesis {
  try {
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === "object" &&
      typeof parsed.text === "string"
    ) {
      return {
        text: parsed.text,
        confidence:
          typeof parsed.confidence === "number" ? parsed.confidence : null,
      };
    }
  } catch {
    // fall through to the raw-string fallback below
  }
  return { text: raw, confidence: null };
}

// Buffer after the native recognizer confirms it's torn down (onFinalResult)
// before starting a new session — starting again immediately, or based on
// onResult/onTimeout alone, raced the native teardown and threw
// "Recognizer is already in use".
const RESTART_DELAY_MS = 300;

// Same notification id/icon voiceSessionStore uses for the in-call foreground
// service — there is only ever one real Android service under the hood
// (@supersami/rn-foreground-service tracks a single running/not-running flag,
// not one per id), so reusing it keeps a single notification that just
// changes text instead of fighting the call's own start/stop calls.
const SERVICE_ID = 4471;
const LISTENING_TITLE = "Czen Driver";
const LISTENING_MESSAGE = "Đang lắng nghe từ khoá đánh thức trợ lý";

let modelLoaded = false;
let modelLoadPromise: Promise<void> | null = null;
// True from the moment start() is requested until onFinalResult/onError
// confirms the native recognizer is actually free again — NOT the same as
// "a start() call is in flight", since the native side keeps the recognizer
// busy for a bit after onResult/onTimeout too.
let sessionActive = false;
// Guards against onWakeWordDetected firing more than once for the same
// utterance (onResult can still race with a near-simultaneous onFinalResult
// on session teardown).
let triggered = false;
let desiredListening = false;
let restartTimer: ReturnType<typeof setTimeout> | null = null;
// Fallback for when Vosk.stop() is called mid-utterance (the exact case
// that happens every time — the driver's own wake phrase is still an
// in-progress partial result when we call stop() to react to it) and the
// native side never fires onTimeout/onFinalResult/onError to confirm
// teardown. Observed in practice: sessionActive stayed stuck `true` forever
// after this, silently blocking every future scheduleRestart() check
// (`!sessionActive`) with no error or log to explain why — hands-free mode
// looked "on" but could never listen again. This timer force-resets
// sessionActive if native confirmation doesn't arrive within a few seconds,
// so a missing callback can never permanently wedge listening.
let sessionActiveResetTimer: ReturnType<typeof setTimeout> | null = null;
const SESSION_ACTIVE_RESET_MS = 2500;

function clearSessionActiveResetTimer() {
  if (sessionActiveResetTimer) {
    clearTimeout(sessionActiveResetTimer);
    sessionActiveResetTimer = null;
  }
}
// Consecutive Vosk.start() failures in a row — reset to 0 on any success.
// Drives the retry pace in startListening()'s catch block: quick backoff for
// the first MAX_START_RETRIES attempts (a brief teardown race is plausible
// right after a call ends), then SLOW_RETRY_DELAY_MS forever after that.
// Never actually gives up while desiredListening is still true — "keep
// listening until the toggle is turned off" means exactly that, so a start()
// failure can never be the thing that silently kills hands-free mode.
let startFailureCount = 0;
const MAX_START_RETRIES = 3;
const SLOW_RETRY_DELAY_MS = 30000;

function clearRestartTimer() {
  if (restartTimer) {
    clearTimeout(restartTimer);
    restartTimer = null;
  }
}

function scheduleRestart(delayMs = RESTART_DELAY_MS) {
  clearRestartTimer();
  restartTimer = setTimeout(() => {
    restartTimer = null;
    if (
      desiredListening &&
      !sessionActive &&
      useVoiceSessionStore.getState().status === "idle"
    ) {
      startListening();
    }
  }, delayMs);
}

async function ensureForegroundServiceForListening() {
  await ForegroundService.start({
    id: SERVICE_ID,
    title: LISTENING_TITLE,
    message: LISTENING_MESSAGE,
    ServiceType: "microphone",
    icon: "ic_launcher",
  } as any);
}

function matchesWakePhrase(text: string) {
  const normalized = text.trim().toLowerCase();
  return WAKE_PHRASES.some((phrase) => normalized.includes(phrase));
}

async function onWakeWordDetected() {
  clearRestartTimer();
  stopListening();

  // Not persisted (see authStore.ts) — this module runs outside the
  // component tree (a Vosk event callback), so it reads the profile
  // straight from the React Query cache useCurrentUser() populates.
  const driver = queryClient.getQueryData<Driver>(["me"]);
  if (!driver) {
    triggered = false;
    return;
  }

  await useVoiceSessionStore.getState().connect(driver.phone);
  // Brings the app to the foreground even if the driver was in another app —
  // relies on the active foreground service being exempt from Android's
  // background activity-start restrictions. Must use expo-linking's
  // createURL() (not a hardcoded "driver-app://" string): in an Expo Dev
  // Client build, the bare scheme is ambiguous with the dev client's own
  // launcher and can route there instead of back into the running app,
  // which was silently reloading/killing the in-flight call on every
  // wake-word trigger after the first.
  Linking.openURL(ExpoLinking.createURL("/")).catch(() => {});
}

// Registers the Vosk event listeners once for the lifetime of this module
// instance. Called unconditionally at module load (see bottom of file) and
// torn down/re-registered on every reload — same reasoning as the
// voiceSessionStore subscription below: a stale flag guarding "only once"
// survives across Fast Refresh and silently stops matching against the
// closures startListening()/enableWakeWord() actually use.
function registerListeners() {
  // No longer matches on the partial result — Vosk never attaches per-word
  // confidence to partial hypotheses (see MIN_CONFIDENCE above), so there's
  // nothing reliable to gate a trigger on until a full utterance completes
  // via onResult.
  const subs = [
    Vosk.onPartialResult((raw) => {
      // TEMP DEBUG — remove once we've confirmed whether Vosk is receiving
      // real mic audio at all (any non-empty text, even wrong/gibberish) vs
      // genuine silence (never fires, or always fires with empty text).
      console.log(
        "[wake-word] partial:",
        JSON.stringify(parseVoskEvent(raw).text),
      );
    }),
    Vosk.onResult((raw) => {
      const { text, confidence } = parseVoskEvent(raw);
      console.log(
        "[wake-word] result:",
        JSON.stringify(text),
        "confidence:",
        confidence,
      );
      // `confidence === null` means the native patch isn't actually running
      // (a JS-only reload doesn't rebuild the native Kotlin module — see
      // patches/react-native-vosk+2.1.7.patch) — falls back to plain text
      // matching rather than permanently blocking every match.
      const confidenceOk = confidence === null || confidence >= MIN_CONFIDENCE;
      if (
        sessionActive &&
        !triggered &&
        matchesWakePhrase(text) &&
        confidenceOk
      ) {
        triggered = true;
        onWakeWordDetected();
        return;
      }
      // No match (or not confident enough) — do NOT stop()/restart the
      // recognizer here. Recreating the Recognizer/SpeechService (and its
      // AudioRecord) is unreliable on this environment: the very first
      // session after a fresh start() captures real audio fine, but every
      // session after a stop()+start() cycle came back silently deaf (no
      // error, just no more real mic input) — matching reports of it "only
      // working once right after opening the app". Leaving the same session
      // running for any recognized-but-non-matching speech avoids ever
      // touching the AudioRecord again except when we truly must (a call
      // starting, or the toggle going off).
    }),
    // The native side (VoskModule.kt) already tears the recognizer down
    // internally before emitting "timeout" — onFinalResult never follows a
    // timeout, only an explicit stop() on an active session. Relying solely
    // on onFinalResult to trigger the next restart left listening dead for
    // good the moment the driver went quiet for the full session window
    // (visually: the mic indicator dot went out and never came back).
    Vosk.onTimeout(() => {
      clearSessionActiveResetTimer();
      sessionActive = false;
      if (!triggered) scheduleRestart();
    }),
    Vosk.onFinalResult(() => {
      clearSessionActiveResetTimer();
      sessionActive = false;
      if (!triggered) scheduleRestart();
    }),
    Vosk.onError((error) => {
      console.error("[wake-word] vosk error", error);
      clearSessionActiveResetTimer();
      sessionActive = false;
      if (!triggered) scheduleRestart(1000);
    }),
  ];
  return () => subs.forEach((sub) => sub.remove());
}

async function ensureModelLoaded() {
  if (modelLoaded) return;
  if (!modelLoadPromise) {
    modelLoadPromise = Vosk.loadModel(MODEL_NAME).then(() => {
      modelLoaded = true;
    });
  }
  await modelLoadPromise;
}

async function startListening() {
  if (Platform.OS !== "android") return;
  if (sessionActive) {
    console.log("[wake-word] startListening: skipped, sessionActive already true");
    return;
  }
  clearRestartTimer();
  clearSessionActiveResetTimer();

  sessionActive = true;
  triggered = false;
  try {
    await ensureModelLoaded();
    await ensureForegroundServiceForListening();
    // No `timeout` — repeatedly tearing down and re-opening the recognizer's
    // AudioRecord on a silence timeout (previously every ~10s) is what left
    // later sessions capturing nothing: opening a new AudioRecord too soon
    // after releasing the last one is a known flaky pattern on Android/
    // emulators. Restart only happens now on a genuine recognized utterance
    // (onResult/onFinalResult) or an explicit stop (call start, toggle off),
    // both far less frequent than a fixed silence timer.
    await Vosk.start({
      grammar: [...WAKE_PHRASES, ...GRAMMAR_DECOY_WORDS, "[unk]"],
    });
    console.log("[wake-word] startListening: Vosk.start succeeded");
    startFailureCount = 0;
  } catch (err) {
    console.error("[wake-word] failed to start listening", err);
    sessionActive = false;
    startFailureCount += 1;
    if (desiredListening) {
      const delay =
        startFailureCount <= MAX_START_RETRIES
          ? 1000 * startFailureCount
          : SLOW_RETRY_DELAY_MS;
      scheduleRestart(delay);
    }
  }
}

/** Asks the recognizer to stop — actual teardown is confirmed by onFinalResult/onError. */
function stopListening() {
  clearRestartTimer();
  if (!sessionActive) return;
  try {
    Vosk.stop();
    // See SESSION_ACTIVE_RESET_MS's declaration — stopping mid-utterance
    // (the normal case: the wake phrase itself is still an in-progress
    // partial result when this runs) doesn't reliably get an
    // onTimeout/onFinalResult/onError confirmation back. Without this,
    // `sessionActive` can get stuck `true` forever, silently blocking every
    // future scheduleRestart() check with nothing logged to explain why.
    clearSessionActiveResetTimer();
    sessionActiveResetTimer = setTimeout(() => {
      sessionActiveResetTimer = null;
      if (sessionActive) {
        console.warn(
          "[wake-word] native never confirmed stop — force-resetting sessionActive",
        );
        sessionActive = false;
        if (desiredListening) scheduleRestart();
      }
    }, SESSION_ACTIVE_RESET_MS);
  } catch (err) {
    console.error("[wake-word] failed to stop listening", err);
    sessionActive = false;
  }
}

/** Call once the driver is logged in and has opted into hands-free wake-word. */
export async function enableWakeWord() {
  desiredListening = true;
  // Toggling it back on is the driver explicitly asking to try again — don't
  // let a stale failure count from a previous session block this fresh
  // attempt behind the slow-retry pace.
  startFailureCount = 0;
  if (useVoiceSessionStore.getState().status === "idle") {
    await startListening();
  }
}

/** Call on logout or when the driver turns the toggle off. */
export async function disableWakeWord() {
  desiredListening = false;
  stopListening();
  sessionActive = false;
  triggered = false;
  if (modelLoaded) {
    Vosk.unload();
    modelLoaded = false;
    modelLoadPromise = null;
  }
  // A call in progress keeps its own foreground service running — only stop
  // it here if nothing else needs it.
  if (useVoiceSessionStore.getState().status === "idle") {
    ForegroundService.stop().catch(() => {});
  }
}

// React to call state changes so the wake-word listener never fights the
// LiveKit mic: release it the moment a call starts (however it was started —
// wake-word, the mic button, anything), and pick it back up once the call
// ends, as long as the toggle is still on.
//
// Every time this module is evaluated (including a Fast Refresh reload in
// dev) it gets its own fresh `desiredListening`/`startListening` closures —
// leaving a *previous* subscription alive would keep reacting with stale
// state that `enableWakeWord()`/`disableWakeWord()` (called on the *new*
// module instance) can no longer reach, which is exactly what caused "must
// toggle twice" and "doesn't resume after a call ends" in practice. Tearing
// down the old subscription before registering a new one keeps exactly one
// subscription alive, always bound to the current closures, in both dev and
// production.
const globalScope = globalThis as {
  __czenWakeWordUnsubscribe?: () => void;
  __czenWakeWordRemoveVoskListeners?: () => void;
};

globalScope.__czenWakeWordRemoveVoskListeners?.();
globalScope.__czenWakeWordRemoveVoskListeners = registerListeners();

globalScope.__czenWakeWordUnsubscribe?.();
globalScope.__czenWakeWordUnsubscribe = useVoiceSessionStore.subscribe(
  (state, prevState) => {
    if (state.status === prevState.status) return;
    console.log(
      "[wake-word] voiceSessionStore status:",
      prevState.status,
      "->",
      state.status,
      "desiredListening:",
      desiredListening,
    );

    if (state.status === "connecting") {
      stopListening();
      return;
    }

    if (state.status === "idle" && desiredListening) {
      // Not an immediate startListening() — a small buffer still helps even
      // though voiceSessionStore's RoomEvent.Disconnected handler now
      // *awaits* stopAudioSession() before flipping to 'idle' (so the mic is
      // genuinely free by the time this fires, not just "probably free
      // after a big guessed delay" like before) — there's still some
      // OS-level settling time on the native bridge round-trip. Shorter than
      // the old 800ms guess since it's now backing up a real guarantee
      // instead of standing in for one.
      console.log("[wake-word] scheduling resume in 400ms");
      scheduleRestart(400);
    }
  },
);
