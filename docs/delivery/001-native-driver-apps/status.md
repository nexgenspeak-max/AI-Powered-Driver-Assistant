# 001-native-driver-apps — status

Request (verbatim): "OK giờ phần mobile app trong lúc đang có thời gian có thể làm 2 app 1 là ios swift 2 là androkid kotin ko .../src/frontend/mobile-app" + "Làm theo phong cách hiệu ứng glassy mới nhất của ios nhỉ" + "Android cũng vậy". Triage answers: driver-app; full parity with the RN app.
Path: Full (Discover n.a.) — because it is a rewrite of an existing product (the RN driver-app is the reference spec) on two new native platforms.
Appetite: 3 sessions of agent work · started 2026-11-12 · **Spent: 0 of 3 sessions**
Platforms in scope: iOS | Android
Status: doing

**Next action:** Read the independent review (background agent); fix must-fix findings on both apps plus the iOS garbled map labels (Android renders the same Goong tiles correctly, so it is an iOS-side text decoding issue); re-run gates; commit; demo page.

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
| Build | doing | android ec2d714 (lint, 42 unit, journey green); ios 9ab67a9 (34 tests + XCUITest green on iOS 26.1); review pending |
| Verify | todo | |
| Demo | todo | |
| Release | n.a. | local only |
| Operate | n.a. | |
| Learn | todo | |

## Slices

| Slice | Items | Verified | Demo | Notified | Feedback → re-plan | Release |
| --- | --- | --- | --- | --- | --- | --- |
| 1 Skeleton | | | | | | — |

## Progress log (one line per item or slice)

- 2026-11-12 triage — driver-app, full parity, Liquid Glass on iOS, glassy on Android.
- 2026-11-12 spec/design written; build agents launched for iOS and Android.
- 2026-11-12 android app — committed ec2d714, review pending.
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

## Retro
