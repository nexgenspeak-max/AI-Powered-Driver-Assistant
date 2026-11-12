# Czen Driver — native iOS progress

Contract: `docs/delivery/001-native-driver-apps/{parity-map,spec,design}.md`.

## How to build / run

```sh
cd src/frontend/mobile-app/ios
python3 scripts/seed-local-config.py          # writes uncommitted Config/Local.xcconfig from driver-app/.env
xcodegen generate
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

Test notes
- `xcodebuild test` passes on an iOS 26.1 iPhone 17 Pro simulator (34 Swift Testing tests + 1 XCUITest journey).
- On the iOS 27.0 simulator runtime the XCTest runner never connects ("test runner hung before establishing
  connection" / kAXErrorServerNotFound) — a simulator/Xcode 27 issue; the app itself runs there (screenshots).
- First LiveKit/WebRTC package resolve downloads ~600 MB; it can take 30+ minutes on a slow link.

Deviations from the RN app (decided)
- Tab bar: system Liquid Glass TabView; the orb floats over a 5th "Trợ lý" tab slot (tab selection intercepted).
- Map overlays render as light glass in both themes (Goong tiles are light), replacing the RN forced status bar.
- Buttons use `.glassProminent` / `.glass` instead of the Skia gradient pill; segmented control keeps the gradient.
- Transcript "final" = stream closed (Swift SDK exposes only header attributes, not the trailer flag).
- Wake word: on-device SFSpeechRecognizer with a decoy-tolerant matcher (no Vosk grammar on iOS).
- Single app target with feature folders (no local SPM packages yet).
