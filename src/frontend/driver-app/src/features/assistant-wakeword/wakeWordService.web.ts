// Web has no native speech-recognition backend for react-native-vosk, and
// Metro/Expo picks this file over wakeWordService.ts automatically when
// bundling for web — importing the real module there would crash the whole
// app at startup (react-native-vosk's native binding is undefined on web).
export async function enableWakeWord() {}

export async function disableWakeWord() {}

export async function releaseMicForLiveKit() {}
