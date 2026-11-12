# Czen Driver — Android (Kotlin / Compose) progress

Contract: `docs/delivery/001-native-driver-apps/{parity-map,spec,design}.md`.

## Environment

- JDK: `export JAVA_HOME=/opt/homebrew/opt/openjdk@17`
- SDK: `export ANDROID_HOME=$HOME/Library/Android/sdk` (platforms 36 + 37.0, build-tools 36, emulator, image `android-36;google_apis;arm64-v8a`)
- AVD: `czen_pixel` (Pixel 8). Headless: `$ANDROID_HOME/emulator/emulator -avd czen_pixel -no-window -no-audio -gpu swiftshader_indirect &`
- Secrets: `./scripts/seed-local-properties.sh` copies URLs + Goong key from `driver-app/.env` into the uncommitted `local.properties` (values never printed).
- Build: `./gradlew lint testDemoDebugUnitTest assembleDemoDebug`

## Decisions (recorded, see report)

- Single `app` module, packages `core/*`, `designsystem/*`, `feature/*`, `app/*` (one reason to change today; split later).
- compileSdk 37 (core-ktx 1.19.1 / okhttp 5.5.1 require it); targetSdk 36, minSdk 29.
- Gradle 9.9.1, AGP 9.5.1 (built-in Kotlin), Kotlin 2.4.21, KSP 2.3.13, Compose BOM 2026.09.00 (material3 1.4.0 — Expressive APIs are internal there, so `MaterialTheme`).
- Glass: Haze 2.1.0 — `hazeBlur` (frosted bars/sheets) and `hazeGlass` (lens: orb, map controls, pill) + tint + 1 dp rim + sheen; tinted fallback below API 31.
- Tab bar: floating glass capsule (matches the iOS 26 twin) instead of the RN edge-attached bar.
- Demo flavor: `FakeBackend` implements `AuthApi`/`TripApi`/`DispatchSocket` from `src/demo/assets/demo/*.json`; fake voice engine, location and contacts.
- Vosk model is NOT duplicated in git: `syncVoskModel` copies `driver-app/assets/model-en-us` into generated assets at build time.
- No Room: like the RN app there is no persisted data cache (in-memory `Loadable` state per query).

## Done

- [x] Gradle skeleton, version catalog, wrapper, flavors demo/prod, local.properties seeding
- [x] Theme (parity palette → M3 roles, Inter), Czen icon set (generated from glyphs.ts), CzenMark
- [x] Glass modifier + components (buttons, toggle, segmented, badge, skeleton, empty state, inputs, app bar)
- [x] Core: models, formatting, search folding, geo/polyline/navigation math/push cadence/live leg
- [x] Network: Retrofit APIs, auth header, single-flight refresh authenticator, Keystore token store, prefs
- [x] Repos: session, driver context + mutations; dispatch socket; app coordinator (socket, nudge auto-connect, push on new trip)
- [x] Voice session state machine (VoiceSession), chat store with transcript merge
- [x] Shell: typed routes, glass tab bar with orb slot, overlays, deep links
- [x] Auth: landing, login, register

- [x] Chuyến (dashboard, segments, search, toggle, cards, stepper, optimized route, dialogs), add trip, offer sheet
- [x] Voice: VoiceSession, LiveKit engine (prod, compiled not run live), fake engine (demo), orb, chat panel, composer, wake word (Vosk, compiled not exercised by voice)
- [x] Home map (MapLibre + Goong), status pill, recenter, NextStop/GoOnline cards, turn-by-turn HUD, background location
- [x] Earnings, Profile + 10 sub-screens, Assistant settings
- [x] 42 JVM unit tests (refresh single-flight incl. MockWebServer, transcript merge/dedupe, nav math, cadence, formatting, search, earnings, voice session, repository) + instrumented MainJourneyTest (demo)
- [x] Screenshots dark + light in `docs/delivery/001-native-driver-apps/evidence/android/`

## Remaining / follow-ups

- Live LiveKit + real backend never exercised (no credentials by rule); verify prod flavor against the backend.
- Wake word "hey ai" not tested with real audio; foregrounding from background may be blocked by Android BAL rules.
- Navigation HUD only checked in code/unit tests, not captured on screen.
- No tablet/foldable or 200 % font-scale screenshots yet; no Macrobenchmark / Baseline Profile.
- Optional tests: `orbActionFor`, `WakeWordRules`.

## Verify

```
./gradlew lint testDemoDebugUnitTest assembleDemoDebug assembleProdDebug connectedDemoDebugAndroidTest
```
Screenshot pass: scratch script logic = pm clear → grant perms → `driver-app://demo/theme?mode=light|dark` → `driver-app://dev-login?phone=0901234567&password=secret1` → `driver-app://open/<trips|earnings|profile|assistant-settings>` → `driver-app://demo/offer` → `driver-app://demo/chat`.
