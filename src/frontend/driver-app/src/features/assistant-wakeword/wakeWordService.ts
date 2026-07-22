import { Platform, Linking } from 'react-native'
import * as ExpoLinking from 'expo-linking'
import ForegroundService from '@supersami/rn-foreground-service'
import * as Vosk from 'react-native-vosk'
import { queryClient } from '../../providers/QueryProvider'
import { useVoiceSessionStore } from '../home/stores/voiceSessionStore'
import type { Driver } from '../../types'

// Model downloaded from https://alphacephei.com/vosk/models (Apache-2.0, no
// account needed) and unpacked into assets/model-vi-vn — see the
// "react-native-vosk" plugin entry in app.json for how it gets bundled.
const MODEL_NAME = 'model-vi-vn'

// Vosk's `grammar` option only matches reliably against words already in the
// model's dictionary, so this uses plain Vietnamese words rather than a
// made-up brand phrase. Re-tune after testing recognition on a real device.
const WAKE_PHRASE = 'xin chào'
// Buffer after the native recognizer confirms it's torn down (onFinalResult)
// before starting a new session — starting again immediately, or based on
// onResult/onTimeout alone, raced the native teardown and threw
// "Recognizer is already in use".
const RESTART_DELAY_MS = 300

// Same notification id/icon voiceSessionStore uses for the in-call foreground
// service — there is only ever one real Android service under the hood
// (@supersami/rn-foreground-service tracks a single running/not-running flag,
// not one per id), so reusing it keeps a single notification that just
// changes text instead of fighting the call's own start/stop calls.
const SERVICE_ID = 4471
const LISTENING_TITLE = 'Czen Driver'
const LISTENING_MESSAGE = 'Đang lắng nghe từ khoá đánh thức trợ lý'

let modelLoaded = false
let modelLoadPromise: Promise<void> | null = null
// True from the moment start() is requested until onFinalResult/onError
// confirms the native recognizer is actually free again — NOT the same as
// "a start() call is in flight", since the native side keeps the recognizer
// busy for a bit after onResult/onTimeout too.
let sessionActive = false
// Guards against onWakeWordDetected firing more than once for the same
// utterance (onPartialResult fires repeatedly while speech is still coming).
let triggered = false
let desiredListening = false
let restartTimer: ReturnType<typeof setTimeout> | null = null

function clearRestartTimer() {
  if (restartTimer) {
    clearTimeout(restartTimer)
    restartTimer = null
  }
}

function scheduleRestart(delayMs = RESTART_DELAY_MS) {
  clearRestartTimer()
  restartTimer = setTimeout(() => {
    restartTimer = null
    if (desiredListening && !sessionActive && useVoiceSessionStore.getState().status === 'idle') {
      startListening()
    }
  }, delayMs)
}

async function ensureForegroundServiceForListening() {
  await ForegroundService.start({
    id: SERVICE_ID,
    title: LISTENING_TITLE,
    message: LISTENING_MESSAGE,
    ServiceType: 'microphone',
    icon: 'ic_launcher',
  } as any)
}

function matchesWakePhrase(text: string) {
  return text.trim().toLowerCase().includes(WAKE_PHRASE)
}

async function onWakeWordDetected() {
  clearRestartTimer()
  stopListening()

  // Not persisted (see authStore.ts) — this module runs outside the
  // component tree (a Vosk event callback), so it reads the profile
  // straight from the React Query cache useCurrentUser() populates.
  const driver = queryClient.getQueryData<Driver>(['me'])
  if (!driver) {
    triggered = false
    return
  }

  await useVoiceSessionStore.getState().connect(driver.phone)
  // Brings the app to the foreground even if the driver was in another app —
  // relies on the active foreground service being exempt from Android's
  // background activity-start restrictions. Must use expo-linking's
  // createURL() (not a hardcoded "driver-app://" string): in an Expo Dev
  // Client build, the bare scheme is ambiguous with the dev client's own
  // launcher and can route there instead of back into the running app,
  // which was silently reloading/killing the in-flight call on every
  // wake-word trigger after the first.
  Linking.openURL(ExpoLinking.createURL('/')).catch(() => {})
}

// Registers the Vosk event listeners once for the lifetime of this module
// instance. Called unconditionally at module load (see bottom of file) and
// torn down/re-registered on every reload — same reasoning as the
// voiceSessionStore subscription below: a stale flag guarding "only once"
// survives across Fast Refresh and silently stops matching against the
// closures startListening()/enableWakeWord() actually use.
function registerListeners() {
  // Match on the partial result too, not just the final one — reacting the
  // instant the phrase is heard (instead of waiting for the driver to go
  // quiet) is what makes the wake-up feel instant rather than laggy.
  const subs = [
    Vosk.onPartialResult(text => {
      // TEMP DEBUG — remove once we've confirmed whether Vosk is receiving
      // real mic audio at all (any non-empty text, even wrong/gibberish) vs
      // genuine silence (never fires, or always fires with empty text).
      console.log('[wake-word] partial:', JSON.stringify(text))
      if (sessionActive && !triggered && matchesWakePhrase(text)) {
        triggered = true
        onWakeWordDetected()
      }
    }),
    Vosk.onResult(text => {
      console.log('[wake-word] result:', JSON.stringify(text))
      if (sessionActive && !triggered && matchesWakePhrase(text)) {
        triggered = true
        onWakeWordDetected()
        return
      }
      // No match — do NOT stop()/restart the recognizer here. Recreating the
      // Recognizer/SpeechService (and its AudioRecord) is unreliable on this
      // environment: the very first session after a fresh start() captures
      // real audio fine, but every session after a stop()+start() cycle came
      // back silently deaf (no error, just no more real mic input) — matching
      // reports of it "only working once right after opening the app".
      // Leaving the same session running for any recognized-but-non-matching
      // speech avoids ever touching the AudioRecord again except when we
      // truly must (a call starting, or the toggle going off).
    }),
    // The native side (VoskModule.kt) already tears the recognizer down
    // internally before emitting "timeout" — onFinalResult never follows a
    // timeout, only an explicit stop() on an active session. Relying solely
    // on onFinalResult to trigger the next restart left listening dead for
    // good the moment the driver went quiet for the full session window
    // (visually: the mic indicator dot went out and never came back).
    Vosk.onTimeout(() => {
      sessionActive = false
      if (!triggered) scheduleRestart()
    }),
    Vosk.onFinalResult(() => {
      sessionActive = false
      if (!triggered) scheduleRestart()
    }),
    Vosk.onError(error => {
      console.error('[wake-word] vosk error', error)
      sessionActive = false
      if (!triggered) scheduleRestart(1000)
    }),
  ]
  return () => subs.forEach(sub => sub.remove())
}

async function ensureModelLoaded() {
  if (modelLoaded) return
  if (!modelLoadPromise) {
    modelLoadPromise = Vosk.loadModel(MODEL_NAME).then(() => {
      modelLoaded = true
    })
  }
  await modelLoadPromise
}

async function startListening() {
  if (Platform.OS !== 'android') return
  if (sessionActive) return
  clearRestartTimer()

  sessionActive = true
  triggered = false
  try {
    await ensureModelLoaded()
    await ensureForegroundServiceForListening()
    // No `timeout` — repeatedly tearing down and re-opening the recognizer's
    // AudioRecord on a silence timeout (previously every ~10s) is what left
    // later sessions capturing nothing: opening a new AudioRecord too soon
    // after releasing the last one is a known flaky pattern on Android/
    // emulators. Restart only happens now on a genuine recognized utterance
    // (onResult/onFinalResult) or an explicit stop (call start, toggle off),
    // both far less frequent than a fixed silence timer.
    await Vosk.start({ grammar: [WAKE_PHRASE, '[unk]'] })
  } catch (err) {
    console.error('[wake-word] failed to start listening', err)
    sessionActive = false
  }
}

/** Asks the recognizer to stop — actual teardown is confirmed by onFinalResult/onError. */
function stopListening() {
  clearRestartTimer()
  if (!sessionActive) return
  try {
    Vosk.stop()
  } catch (err) {
    console.error('[wake-word] failed to stop listening', err)
    sessionActive = false
  }
}

/** Call once the driver is logged in and has opted into hands-free wake-word. */
export async function enableWakeWord() {
  desiredListening = true
  if (useVoiceSessionStore.getState().status === 'idle') {
    await startListening()
  }
}

/** Call on logout or when the driver turns the toggle off. */
export async function disableWakeWord() {
  desiredListening = false
  stopListening()
  sessionActive = false
  triggered = false
  if (modelLoaded) {
    Vosk.unload()
    modelLoaded = false
    modelLoadPromise = null
  }
  // A call in progress keeps its own foreground service running — only stop
  // it here if nothing else needs it.
  if (useVoiceSessionStore.getState().status === 'idle') {
    ForegroundService.stop().catch(() => {})
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
  __czenWakeWordUnsubscribe?: () => void
  __czenWakeWordRemoveVoskListeners?: () => void
}

globalScope.__czenWakeWordRemoveVoskListeners?.()
globalScope.__czenWakeWordRemoveVoskListeners = registerListeners()

globalScope.__czenWakeWordUnsubscribe?.()
globalScope.__czenWakeWordUnsubscribe = useVoiceSessionStore.subscribe((state, prevState) => {
  if (state.status === prevState.status) return

  if (state.status === 'connecting') {
    stopListening()
    return
  }

  if (state.status === 'idle' && desiredListening) {
    // Not an immediate startListening() — voiceSessionStore's own
    // RoomEvent.Disconnected handler (stopAudioSession/stopCallForegroundService,
    // in voiceSessionStore.ts, untouched) tears down the same mic/foreground
    // service resources at the same moment. Racing that teardown with a fresh
    // Vosk.start() failed silently (same class of bug as the earlier
    // "Recognizer already in use" — just at the call/mic-handoff boundary
    // instead of between wake-word sessions), so give it a beat first.
    scheduleRestart(800)
  }
})
