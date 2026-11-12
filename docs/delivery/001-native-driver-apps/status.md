# 001-native-driver-apps — status

Request (verbatim): "OK giờ phần mobile app trong lúc đang có thời gian có thể làm 2 app 1 là ios swift 2 là androkid kotin ko .../src/frontend/mobile-app" + "Làm theo phong cách hiệu ứng glassy mới nhất của ios nhỉ" + "Android cũng vậy". Triage answers: driver-app; full parity with the RN app.
Path: Full (Discover n.a.) — because it is a rewrite of an existing product (the RN driver-app is the reference spec) on two new native platforms.
Appetite: 3 sessions of agent work · started 2026-11-12 · **Spent: 1 of 3 sessions**
Platforms in scope: iOS | Android
Status: done

**Next action:** Owner check with a real account on device/simulator (LiveKit voice, wake word, background location); provide https backend URLs before any Release build. Then pick backlog items below.

Resume: re-invoke `ship`; "Where am I?" reads this file and does the Next action.

## Delivery profile used

- reply language: Vietnamese (~/.claude/CLAUDE.md)
- frontend / backend: SwiftUI + Kotlin/Compose (user request); backend unchanged (existing AWS)
- mobile: iOS + Android, monorepo at src/frontend/mobile-app/{ios,android} (user named the folder)
- autonomy: decide-and-record (~/.claude/CLAUDE.md)
- push policy: push every green commit (~/.claude/CLAUDE.md)
- review gate: independent review ≥ 9/10 (~/.claude/CLAUDE.md)
- deploy target: local only (no store accounts named)

## Stages

| Stage | Status | Evidence / link |
| --- | --- | --- |
| Discover | n.a. | existing product |
| Specify | done | spec.md, parity-map.md |
| Set up | todo | |
| Architect | done | design.md D1–D10 |
| Plan | done | build order in agent briefs: skeleton → auth → trips → voice → map → earnings/profile → location/wakeword → tests |
| Build | done | final review iOS 9.1/10, Android 9.3/10, fit 1, security 0.9 (3 review rounds) |
| Verify | done | iOS: 69 unit + 4 UI tests on iOS 26.1 sim; Android: 80 unit + journey on czen_pixel; lint 0; screenshots in evidence/ |
| Demo | done | screenshots sent in chat; run commands in mobile-app/*/PROGRESS.md |
| Release | n.a. | local only |
| Operate | n.a. | |
| Learn | done | retro below |

## Slices

| Slice | Items | Verified | Demo | Notified | Feedback → re-plan | Release |
| --- | --- | --- | --- | --- | --- | --- |
| 1 Full parity | iOS + Android | yes | screenshots | yes | no feedback yet | local only |

## Progress log (one line per item or slice)

- 2026-11-12 triage — driver-app, full parity, Liquid Glass on iOS, glassy on Android.
- 2026-11-12 spec/design written; build agents launched for iOS and Android.
- 2026-11-12 android app — committed ec2d714, review pending.
- 2026-11-12 review r1 fixes — android b244c6b, ios 80ac0ab; r3 fixes — ios 978e79d, android 1f7df1a; final review 9.1 / 9.3 — shipped.
- 2026-11-12 ios app — committed 9ab67a9, review pending. iOS 27.0 simulator: XCTest runner never connects; tests run on iOS 26.1.

## Rulings (decisions taken without asking)

- 2026-11-12 Use Xcode 27 via DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer instead of asking for sudo xcode-select — because it needs no root; reversible by xcode-select.
- 2026-11-12 iOS deployment target iOS 26 so native Liquid Glass (glassEffect, GlassEffectContainer) is used without fallbacks — because the user asked for the newest iOS glass style; simulators iOS 26.1/27.0 installed.
- 2026-11-12 Android: install openjdk@17 + android-commandlinetools via Homebrew; glass look via Compose blur (Haze) on Material 3 Expressive — because Android has no system Liquid Glass.

- 2026-11-12 Two platform agents build in parallel without committing; the controller reviews and commits — because the folders are independent and parallel commits would race on the git index.
- 2026-11-12 Verification uses demo mode with bundled fake data, not the live backend — because no test credentials are to be searched for; live login is the owner's check.

## Questions for the owner (only what nobody else can answer)

- none yet

## Cut scope and backlog findings

- Not exercised against real services: LiveKit room, live backend login, wake word with a real voice, background location — owner check.
- iOS 27.0 simulator XCTest runner hangs; tests run on iOS 26.1.
- Backlog (final review nice-to-haves): iOS tile cache-clear flag only on success; host match `.goong.io`; Android gzip inflate cap; iOS debug-only dev-login deep link (or drop the scheme); iOS register() generation capture before await; Android permission queue survives recreation; Android Keystore encrypt failure keeps in-memory session; tile parser fuzz test; smallest/largest device + largest text screenshots; Macrobenchmark/Baseline Profile; demo APK size (~198 MB, Vosk model).

## Retro

- Slowed us: iOS first SPM resolve (WebRTC ~600 MB, 30+ min) and an XCTest hang on the iOS 27 simulator that ran ~4.5 h before a timeout wrapper was added.
- Caught late: transcript finality, connect cancellation and refresh-vs-logout races only surfaced in independent review; the garbled map labels were wrongly blamed on iOS at first (Goong data was mis-encoded upstream).
- Change: always wrap simulator test runs in a hard timeout; brief build agents with the session-lifecycle checklist (logout cancels in-flight work) up front → skill via improve-skills.
