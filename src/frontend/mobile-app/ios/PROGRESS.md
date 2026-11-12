# Czen Driver — native iOS progress

Contract: `docs/delivery/001-native-driver-apps/{parity-map,spec,design}.md`.

## How to build / run

```sh
cd src/frontend/mobile-app/ios
python3 scripts/seed-local-config.py          # writes uncommitted Config/Local.xcconfig from driver-app/.env
xcodegen generate   # Info.plist is hand-maintained (preprocessed for per-configuration ATS), not generated
export DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer
xcodebuild -project CzenDriver.xcodeproj -scheme CzenDriver \
  -destination 'platform=iOS Simulator,name=Czen Native iOS 26,OS=26.1' \
  -derivedDataPath build/DerivedData -clonedSourcePackagesDirPath build/SourcePackages test
# helpers: scripts/build.sh <udid> (build-for-testing + install), scripts/screenshots.sh <udid> <dir> [filter]
# demo mode (no network): launch argument -demo
```

Demo launch arguments: `-demo`, `-signedOut`, `-authScreen login|register`, `-startTab trips|earnings|profile`,
`-tripsSegment pending|done`, `-showOffer`, `-openChat`, `-connectVoice`, `-route <profile route|add-trip>`,
`-theme light|dark`, `-navigate`, `-uiTesting`.

## Status

See the bottom of this file for the live checklist (updated as slices land).

## Checklist (2026-11-12)

Done
- [x] 1 Skeleton: XcodeGen project, iOS 26 / Swift 6 strict concurrency, asset-catalog palette (scripts/gen-colors.py),
      text styles, glass components, TabView shell with the animated glass Czen orb over the centre slot, demo mode.
- [x] 2 Auth: landing / login / register (validation copy verbatim), Keychain tokens, single-flight refresh actor,
      logout (offline PATCH then wipe), logout broadcast on failed refresh.
- [x] 3 Chuyến: greeting, optimistic online toggle, accent-insensitive search, Chờ/Đang chạy/Xong with counts,
      TripCard / ActiveTripCard (stepper, fresh-fix arrival, 409 alert), cancel/reject confirms, OptimizedRouteCard,
      pull to refresh, loading/empty/error; add-trip (booked_via driver); trip offer sheet (30 s ring, sound + haptic
      unless voice active, auto-dismiss); WebSocket (3 s reconnect, event routing).
- [x] 4 Voice: LiveKit engine (lk.transcription / lk.chat streams, call_state / agent_state, call_control,
      call_transcript in bridge mode, search_contacts RPC), segment merge + 3 s dedupe, chat panel (status chip,
      vn/en captions, suggestions, composer with mic mute / send / voice button, offline canned replies),
      orb states + audio level, last-message toast, auto-connect on pending nudge, hang-up returns home.
- [x] 5 Home map: MapLibre + Goong style, driver/stop markers (trip colours), optimized route line, status pill,
      recenter, NextStopCard (live leg), GoOnlineCard, turn-by-turn HUD (35 m step advance, 50 m × 3 off-route,
      ≤ 1 re-route / 20 s, arrival 4 s).
- [x] 6 Earnings (hero, Swift Charts weekly bars, grouped history + search); Profile + all sub-screens; assistant
      settings (optimistic rollback, local voice language, hands-free mirrors wake word, radius chips).
- [x] 7 Location (foreground cadence, background throttle, immediate pushes), wake word (SFSpeechRecognizer en-US).
- [x] 8 Swift Testing unit tests + one XCUITest demo journey.

Remaining / known gaps
- Wake word and background audio verified by build only (simulator has no real mic session / LiveKit server).
- Live backend never exercised (demo mode only, by instruction).
- Screenshots on iPhone 17 Pro only (no smallest-device / AX-size pass yet).

Review fixes (2026-11-12)
- [x] Transcription finality from `lk.transcription_final` (`TextStreamTranscript`).
- [x] Voice connect is cancellable (also: `LiveKitVoiceEngine.connect` leaves a room whose join completed after a
      `disconnect()`, instead of keeping it live): hang-up / logout while connecting cancels the task (generation checked after
      every await), tears the room down, ends `.idle`; a failed connect stays `.error` (`.disconnected` only
      affects a live session; stale LiveKit room events are dropped).
- [x] Token refresh: session generation + cancel on logout (no tokens written back), slot freed only by its own
      task, "token already rotated" short-circuit; only 400/401/403 from `/auth/refresh` log out.
- [x] Dispatch socket: `.opened` on the handshake (`didOpenWithProtocol`), 20 s ping keepalive (failed / no pong
      in 10 s = close → 3 s reconnect).
- [x] Sign-out stops foreground location (updates + tick), navigation and the background location indicator.
- [x] Turn-by-turn: empty steps = error (no instant arrival); routes resolving after `stop()` are ignored.
- [x] ATS: `NSAllowsArbitraryLoads` only in Debug (`CZ_ALLOW_INSECURE_HTTP` plist preprocessing); Release has
      no ATS exception → HTTPS only (a Release build therefore needs https backend URLs).
- [x] Garbled map labels: not an iOS text bug — Goong's `composite` tiles carry some `point_map` names already
      double-encoded (UTF-8 read as Windows-1252, then title-cased; the same bytes reach Android, whose screenshot
      just shows a different area). `GoongTileRepairer` (MapLibre `MLNNetworkConfiguration` delegate) repairs those
      strings in each Goong vector tile before parsing; the ambient tile cache is cleared once so stale tiles go.
      Known limit: an all-caps source letter Ị/Ọ/Ỏ that the upstream title-casing lowercased can't be told apart
      from Ớ/Ờ/Ở and may decode to the latter.
- [x] Accessibility: "Quay lại" back buttons (root titles), "Gọi {khách}" on trip cards, mic label when not
      connected; orb + composer bars static under Reduce Motion. XCUITest `AccessibilityLabelUITests` checks them.

Review fixes, round 3 (2026-11-12)
- [x] Stale responses after logout: `AppModel.sessionGeneration` (bumped at the start of `logout()` and in
      `resetToSignedOut()`) is captured before each await in `loadMe` / `updateName` / `updateVehicle` (and
      `loadContext` / `loadSettings`); a result from an older session never sets `me`, the driver phone, the
      socket or background tracking.
- [x] Keychain: tokens left by a previous install are wiped on the first launch after (re)install (UserDefaults
      marker `keychain-tokens.install-marker`); writes use `SecItemUpdate` → `SecItemAdd` and log the failing
      OSStatus (never the payload).
- [x] Mic permission denied on connect → no room is joined; `.error` with `errorReason == .micDenied` and the
      "Chưa có quyền dùng micro …" caption (chip shows "Lỗi", never "Đang nghe").
- [x] Release build phase "Require HTTPS backend URLs (Release)" fails the build unless TRIP/AUTH URLs are
      `https://` (and a non-empty WS URL is `wss://`); Debug skips it; env vars are not echoed in the log.
- [x] Orb toast: VoiceOver button ("Czen: …", hint, identifier `orb-toast`); it now also fires when a streamed
      bot reply is finalised (the trigger watched only the text, which does not change on finalisation).
      `fetch` removed from `UIBackgroundModes` (nothing uses background fetch).
- [x] Dispatch socket: a handshake rejected with HTTP 401 retries after 3 s → 6 → 12 … ≤ 60 s; a successful
      open resets it; other closes keep the 3 s reconnect.

Test notes
- `xcodebuild clean test` passes on the "Czen Native iOS 26" (iOS 26.1) simulator with zero warnings: 69 Swift
  Testing tests in 19 suites + 4 XCUITests (demo journey, 3 accessibility tests). Round-3 tests
  (`Round3Tests.swift`): 9 of the 10 failed against the pre-fix sources (the Keychain write-status test passed
  already); the orb-toast UI test failed before the trigger fix.
- Release: `xcodebuild -configuration Release` with the local http config fails at the HTTPS check (by design);
  with https overrides on the command line it builds.
- Earlier: 60 Swift Testing tests in 15 suites + 3 XCUITests (demo journey, 2 accessibility-label tests). Wrap runs in a timeout (e.g. a perl `alarm` wrapper;
  macOS has no `timeout`). The 13 lifecycle tests (`LifecycleTests.swift`) were first run against the pre-fix
  sources: 11 failed there, all pass now.
- On the iOS 27.0 simulator runtime the XCTest runner never connects ("test runner hung before establishing
  connection" / kAXErrorServerNotFound) — a simulator/Xcode 27 issue; the app itself runs there (screenshots).
- First LiveKit/WebRTC package resolve downloads ~600 MB; it can take 30+ minutes on a slow link.

Deviations from the RN app (decided)
- Tab bar: system Liquid Glass TabView; the orb floats over a 5th "Trợ lý" tab slot (tab selection intercepted).
- Map overlays render as light glass in both themes (Goong tiles are light), replacing the RN forced status bar.
- Buttons use `.glassProminent` / `.glass` instead of the Skia gradient pill; segmented control keeps the gradient.
- Transcript finality comes from the stream header attribute `lk.transcription_final` ("false" = interim stream);
  interim streams stay streaming bubbles, only final streams go through dedupe / `call_transcript`.
- Wake word: on-device SFSpeechRecognizer with a decoy-tolerant matcher (no Vosk grammar on iOS).
- Single app target with feature folders (no local SPM packages yet).
