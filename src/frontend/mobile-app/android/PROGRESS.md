# Czen Driver — Android (Kotlin / Compose) progress

Contract: `docs/delivery/001-native-driver-apps/{parity-map,spec,design}.md`.

## Environment

- JDK: `export JAVA_HOME=/opt/homebrew/opt/openjdk@17`
- SDK: `export ANDROID_HOME=$HOME/Library/Android/sdk` (platforms 36 + 37.0, build-tools 36, emulator, image `android-36;google_apis;arm64-v8a`)
- AVD: `czen_pixel` (Pixel 8). Headless: `$ANDROID_HOME/emulator/emulator -avd czen_pixel -no-window -no-audio -gpu swiftshader_indirect &`
- Secrets: `./scripts/seed-local-properties.sh` copies URLs + Goong key from `driver-app/.env` into the uncommitted `local.properties` (values never printed).
- Build: `./gradlew lint testDemoDebugUnitTest assembleDemoDebug`
- Release signing: set `CZEN_RELEASE_STORE_FILE`, `CZEN_RELEASE_STORE_PASSWORD`, `CZEN_RELEASE_KEY_ALIAS`, `CZEN_RELEASE_KEY_PASSWORD` (Gradle properties in `~/.gradle/gradle.properties` or environment). Without them `assemble*Release` / `bundle*Release` fail in `verifyReleaseSigning`; `-PallowDebugSigning=true` signs with the debug key for local testing only.

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
- [x] 42 JVM unit tests at first delivery, 58 after the review fixes (refresh single-flight incl. MockWebServer, transcript merge/dedupe, nav math, cadence, formatting, search, earnings, voice session, repository) + instrumented MainJourneyTest (demo)
- [x] Screenshots dark + light in `docs/delivery/001-native-driver-apps/evidence/android/`

## Review fixes (2026-11-12)

- [x] Live location watch starts from the permission-result callback (`LocationTracker.onLocationPermissionChanged`, visible-only), not only on the next `onStart`.
- [x] Token refresh: `SessionGeneration` (logout bumps it and clears tokens under one lock); a refresh that finishes after logout never writes tokens back.
- [x] Refresh failure: only 400/401/403 from `/auth/refresh` log out; IOException / 5xx fail the request and keep tokens.
- [x] Dispatch WebSocket pings every 20 s (`PING_INTERVAL_MS`) on a socket-only client derived from the trip client.
- [x] Cleartext only in debug (`usesCleartextTraffic` manifest placeholder + `src/debug` network security config); release is HTTPS/WSS only.
- [x] Release signing from `CZEN_RELEASE_*`; otherwise release packaging fails unless `-PallowDebugSigning=true`.
- [x] `dev-login` deep link only when `BuildConfig.DEBUG` (`DeepLinkPolicy`); `demo/*` stays under the demo flag.
- [x] `ServiceForegroundController` rolls back the reason and logs (`Log.w`, no PII) when the start is refused; the service clears reasons when it stops itself.
- [x] `VoiceSession.sendText` / `cancelCall` return false on engine errors (LiveKit `Result` now surfaced with `getOrThrow`).
- [x] Accessibility: remaining clickables carry `Role.Button`; the offer sheet body absorbs taps without a nameless node; orb, offer sheet, chat overlay, tab bar, home cards and status pill are static when the animator duration scale is 0 (`designsystem/motion`, observed live).
- [x] +16 JVM tests (58 total).

## Review fixes round 3 (2026-11-12)

- [x] Location: `LocationTracker` collects `SessionRepository.loggedIn`; GPS watch + 15 s tick run only while visible && logged in; logout stops them and resets `lastPushAt`/`lastPushed`; `pushImmediate` is a no-op signed out.
- [x] Session: `refreshMe`, `register` and `updateAccount` (profile + vehicle) write `me` only via `commitMe` (same `SessionGeneration` and tokens present); `restoreMe` ignores a different/absent account; logout clears tokens and `me` under one lock.
- [x] Dispatch socket: `ReconnectBackoff` — 401/403 handshakes wait 3 → 6 → 12 … 60 s, any successful open resets; other closes stay at 3 s. Server-initiated close (`onClosing`) is now answered and ends the connection (it previously waited for a ping timeout).
- [x] Permissions: `PermissionQueue` (FIFO, one dialog at a time, per-request callbacks) behind `PermissionRequester`; go-online treats COARSE-only (Android 12+ "Approximate") as foreground granted, still asks for background, returns a `LocationGrant` and shows a toast about approximate location.
- [x] Voice: mic denied at the prompt → `VoiceSession.connect(phone, micGranted = false)` → `Error` (error chip/caption); a mic the engine cannot enable after the retry also ends in `Error` (room left); a late `onDisconnected` no longer overwrites `Error`.
- [x] Gradle: `verifyReleaseBaseUrls` fails `assemble*/bundle*/package*/sign*Release` unless trip/auth URLs are `https://` and the WS URL is blank or `wss://` (keys named, values never printed). URL keys can also be given as Gradle properties (`-Pczen.tripServiceUrl=…`). Note: the current local.properties points at the http dev backend, so release builds need https overrides.
- [x] a11y: `ThemeToggle` announces the sun/moon meaning as `stateDescription` ("Giao diện tối/sáng"); `CzenButton` already had `Role.Button` — both now covered by a Robolectric Compose test.
- [x] Map labels (parity with iOS `TileTextRepair.swift`): `MojibakeRepair` + `VectorTileRepair` ported (same cases); `GoongTileRepairInterceptor` on MapLibre's OkHttp client (`HttpRequestUtil.setOkHttpClient`) repairs `*.goong.io/tiles/*.pbf` (gzip inflated when needed), leaves clean tiles byte-for-byte; ambient cache cleared once (`map` prefs `tileRepair.cacheVersion`). Demo deep link `driver-app://demo/location?lat=&lng=` moves the fake GPS. Evidence: `evidence/android/03-home-labels-dark.png` (21.0330, 105.8203 — "Công Ty Cổ Phần Hóa Dược Và Công Nghệ Sinh Học Biogreen").
- [x] +22 JVM tests (80 total); instrumented MainJourneyTest 1/1.

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
Label screenshot: after dev-login, `driver-app://demo/location?lat=21.0330&lng=105.8203` (wait ~10 s for tiles).
Screenshot pass: scratch script logic = pm clear → grant perms → `driver-app://demo/theme?mode=light|dark` → `driver-app://dev-login?phone=0901234567&password=secret1` → `driver-app://open/<trips|earnings|profile|assistant-settings>` → `driver-app://demo/offer` → `driver-app://demo/chat`.
