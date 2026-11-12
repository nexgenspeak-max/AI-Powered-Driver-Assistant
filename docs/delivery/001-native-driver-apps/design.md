# Design — native driver apps

## Layout
`src/frontend/mobile-app/ios/` (XcodeGen `project.yml` → `CzenDriver.xcodeproj`, generated, committed)
`src/frontend/mobile-app/android/` (Gradle, version catalog, wrapper committed)
Both call the existing identity service (`/api/v1/auth`, `/accounts`, `/settings`) and external-api
service (`/api/v1/drivers`, `/trips`, `/voice/token`, WS `/ws`). Base URLs and the Goong key come
from an uncommitted local config (iOS `Config/Local.xcconfig`, Android `local.properties`) seeded
from `driver-app/.env`; committed examples hold placeholders.

## Decisions (ADR-lite)
| # | Decision | Why |
|---|---|---|
| D1 | iOS 26 minimum, SwiftUI, Swift 6 strict concurrency, `@Observable` models, URLSession async | native Liquid Glass (`glassEffect`, `GlassEffectContainer`, system TabView) with no fallback code |
| D2 | Android minSdk 29, target/compile 36, Compose + M3 Expressive, Hilt, Retrofit/OkHttp + kotlinx.serialization, DataStore | skill defaults; minSdk 29 keeps RenderEffect blur on 31+ with a tinted fallback below |
| D3 | Glass on Android via Haze (`dev.chrisbanes.haze`) blur + tint + 1 dp highlight border on bars, orb, composer, floating map controls, sheets | Android has no system Liquid Glass; Haze is the maintained Compose backdrop-blur library |
| D4 | Voice: LiveKit Swift SDK (SPM) / LiveKit Android SDK; same topics, RPC and data formats as RN | protocol parity with the existing agent |
| D5 | Maps: MapLibre Native (SPM `maplibre-gl-native-distribution` / `org.maplibre.gl:android-sdk`) with the Goong style URL | same tiles and style as RN |
| D6 | Wake word: Android Vosk (`com.alphacephei:vosk-android`) with the same bundled small-en model and grammar; iOS on-device `SFSpeechRecognizer` (en-US, `requiresOnDeviceRecognition`) matching "hey ai" | Vosk has no SPM package; Speech framework gives the same behaviour on-device |
| D7 | Tokens: iOS Keychain; Android Keystore-backed encrypted DataStore. Prefs (theme, voice lang, wake word) in UserDefaults / DataStore | parity with SecureStore/MMKV split |
| D8 | Refresh: single in-flight refresh (Swift actor / Kotlin Mutex), replay once, logout on failure | server rotates refresh tokens |
| D9 | Demo mode (`-demo` launch arg / `demo` flavor) swaps the API client for a fake backed by bundled JSON | screenshots and UI tests without a live backend or real credentials |
| D10 | Background: iOS UIBackgroundModes audio+location; Android foreground service types microphone|location (id 4471, channel "Czen Driver") | parity with RN |

## Fitness checks
- `xcodebuild test` and `./gradlew lint testDebugUnitTest` green, zero warnings.
- Demo-mode screenshots of every tab in light and dark on both platforms.
