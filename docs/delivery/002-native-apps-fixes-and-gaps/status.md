# 002-native-apps-fixes-and-gaps — status

Request (verbatim): "Ok thế giờ fix giúp tôi những lỗi và làm nốt những tính năng còn lại trên mobile app đi /ship"
Path: Small (maintain) — existing native apps from 001; fix defects and close parity gaps. No new product scope.
Appetite: 1 session of agent work · started 2026-11-15 · **Spent: 1 of 1 session**
Platforms in scope: iOS | Android (`src/frontend/mobile-app/{ios,android}`)
Status: done

**Next action:** Owner checks on a real device (below). Next planning round: the debt listed under "Cut scope and backlog findings", then the item 7 screenshots.

Resume: re-invoke `ship`; "Where am I?" reads this file and does the Next action.

## Delivery profile used

- reply language: Vietnamese (~/.claude/CLAUDE.md)
- mobile: iOS (Swift/SwiftUI) + Android (Kotlin/Compose), monorepo at src/frontend/mobile-app
- autonomy: decide-and-record
- push policy: push every green commit when a remote exists
- review gate: independent review ≥ 9/10, fit = 1, security ≥ 0.5, ≤ 3 improve rounds
- deploy target: local only

## Stages

| Stage | Status | Evidence / link |
| --- | --- | --- |
| Specify | reuse | 001 spec.md + parity-map.md are the contract |
| Plan | done | backlog below |
| Build | done | b63453b, 9448d46, 409774f, 72fac92 — review 9/10 on both platforms |
| Verify | done | iOS: 113 unit + 4 XCUITests (iOS 26.1 simulator). Android: lint 0, 138 JVM tests, instrumented MainJourneyTest 1/1 and a demo walkthrough on czen_pixel — evidence/android/ |
| Demo | done | results in the final chat message; screenshots in evidence/android/ |
| Release | n.a. | local only |
| Learn | done | retro below |

## Backlog (this delivery)

Sources: staged work in the index, 001 "Cut scope and backlog findings", both PROGRESS.md "Remaining", parity audit.

| # | Platform | Item | Status |
| --- | --- | --- | --- |
| 1 | ios | Listen-only voice join on the simulator (was staged, uncommitted) | done — 9448d46 |
| 2 | ios | Review debt: tile cache-clear flag only on success; host match `.goong.io`; login/register generation capture before await | done — 9448d46 |
| 3 | android | Review debt: gzip inflate cap; host match; permission queue survives recreation; Keystore encrypt failure keeps in-memory session | done — b63453b |
| 4 | all | Tests: tile parser fuzz (both); Android `orbActionFor`, `WakeWordRules` | done — b63453b, 9448d46 |
| 5 | ios | Audit findings 1–16 (stuck after failed /auth/me, offer sheet errors, turn-by-turn retarget, post-logout writes, Always location, trip action feedback, debug dev-login link, NextStop leg values, nudge re-check, haptics, "+" encoding, wake-word reschedule, chat/logout gaps, earnings hero, background accuracy) | done — 409774f; review r1 7/10 (1 blocking), r2 9/10, fit 1, security 0.95 |
| 6 | android | Audit findings 1–19 (offer countdown leak, context before `me`, dropped invalidate, /auth/me retry, wake-word watchdog, foreground service reasons/API 29/refused start, mic on every connect, duplicate GPS watch, turn-by-turn stale route, nudge re-check, portrait lock, POST_NOTIFICATIONS, refresh session guard, offer re-validation, approximate grant on Home, settings error state, contacts RPC timeout) | done — 72fac92; review r1 7/10 (2 blocking), r2 9/10, fit 1, security 1 |
| 7 | all | Evidence gaps: smallest/largest device + largest text screenshots; Android navigation HUD on screen | cut — appetite spent; back to the backlog |

## Progress log (one line per item or slice)

- 2026-11-15 triage — ledger opened; baseline tests and parity audits started.
- 2026-11-15 baseline — Android lint/80 tests/demo build green; iOS 70 unit tests green (incl. the staged listen-only test).
- 2026-11-15 items 1–4 — Android b63453b (94 JVM tests), iOS 9448d46 (73 unit tests); pushed to origin/master.
- 2026-11-15 audits — no missing screen or endpoint on either platform; 18 iOS and 19 Android defects/partials; build agents started on items 5 and 6.
- 2026-11-15 item 5 (ios) — 16 audit items fixed, 113 unit tests in 30 suites + 4 UI tests green (controller rerun); review r2 9/10; committed 409774f, pushed.
- 2026-11-15 item 6 (android) — 19 audit items fixed (127 tests); review r1 7/10 with 2 blocking (foreground-service negotiate, stale deferred connect); round-1 fixes in (138 tests), re-review running.
- 2026-11-15 item 6 (android) — review r2 9/10; committed 72fac92, pushed. Emulator: journey test 1/1; walkthrough shows dev-login, nudge auto-connect opening the chat panel, offer sheet with a running countdown (15 s, then 8 s); no crash in logcat.
- 2026-11-15 item 7 cut — appetite spent.

## Rulings (decisions taken without asking)

- 2026-11-15 "Lỗi" is taken as: failing baseline checks, the recorded review debt, and defects found by a parity audit — because the request names no specific bug; anything the owner saw on a device is asked below.
- 2026-11-15 Commit only mobile-app and this delivery folder by explicit path — because the index holds the owner's unrelated staged thesis and video files.

## Questions for the owner (only what nobody else can answer)

- Which specific bugs did you see on a device or simulator (screen, steps, what happened)? Work continues on the known list meanwhile.

## Cut scope and backlog findings

- iOS, needs a real device (not attempted): audio-session contention between the offer alert, wake word and LiveKit (no interruption/route-change observers in WakeWordService); suspected Room retain cycle in LiveKitVoiceEngine's text-stream handler.
- iOS `driver-app` URL scheme had no handler at all, so the 001 "debug-only dev-login" item had nothing to gate; a DEBUG-only handler is part of item 5.
- iOS debt from review r2 (non-blocking): offer sheet stays as a disabled skeleton until the countdown ends after a final load failure (dismiss on 404 instead); earnings task not keyed on the account id (debug account switch only); no automated tests for haptics, wake-word reschedule, send guard, logout progress, Home denied-location hint.
- Android debt from review r2 (non-blocking): the "mic may stop in the background" caption can be a false alarm when hands-free already holds the mic service; a second contacts request within the 6 s gate timeout can queue a second system dialog. From the build agent: Profile, Earnings and Home show skeletons (no error state) while the profile retry runs; the chat panel opened by a background nudge stays open when the deferred connect is dropped.
- Not verifiable without a device (both platforms): foreground-service behaviour on API 29 and on a refused typed start, permission dialog order, Always-location prompt sequence, haptics, wake word with real audio.
- Still owner checks from 001: live LiveKit room, live backend login, wake word with a real voice, background location on a device.

## Retro

- Slowed us: the repo's first-touch edit hook rejects every first Edit/Write, which doubles the calls for small fixes; the first emulator walkthrough was wasted because an unquoted `&` in an adb deep link was cut by the device shell.
- Caught late: both build agents shipped a retry or negotiation path that could not terminate or tore down running state (iOS offer-sheet retry froze the countdown; Android refused foreground start dropped running reasons, deferred mic connect never expired) — found only by the independent review, not by their own tests.
- Change: brief build agents that every retry, deferred action and fallback must state its stop condition and have a test for it; quote adb deep links inside the device shell.
