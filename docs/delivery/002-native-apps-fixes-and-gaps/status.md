# 002-native-apps-fixes-and-gaps — status

Request (verbatim): "Ok thế giờ fix giúp tôi những lỗi và làm nốt những tính năng còn lại trên mobile app đi /ship"
Path: Small (maintain) — existing native apps from 001; fix defects and close parity gaps. No new product scope.
Appetite: 1 session of agent work · started 2026-11-15 · **Spent: 0 of 1 session**
Platforms in scope: iOS | Android (`src/frontend/mobile-app/{ios,android}`)
Status: in progress

**Next action:** Read the baseline test results and the two parity audits, write the backlog below, then run the item loop (iOS listen-only first).

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
| Plan | doing | backlog below |
| Build | todo | |
| Verify | todo | |
| Demo | todo | |
| Release | n.a. | local only |
| Learn | todo | |

## Backlog (this delivery)

Sources: staged work in the index, 001 "Cut scope and backlog findings", both PROGRESS.md "Remaining", parity audit.

| # | Platform | Item | Status |
| --- | --- | --- | --- |
| 1 | ios | Listen-only voice join on the simulator (staged, uncommitted) — verify tests, commit | todo |
| 2 | ios | Review debt: tile cache-clear flag only on success; host match `.goong.io`; debug-only dev-login deep link; register() generation capture before await | todo |
| 3 | android | Review debt: gzip inflate cap; permission queue survives recreation; Keystore encrypt failure keeps in-memory session | todo |
| 4 | all | Tests: tile parser fuzz; Android `orbActionFor`, `WakeWordRules` | todo |
| 5 | all | Parity gaps and defects found by the audit (filled in after the audit) | todo |
| 6 | all | Evidence gaps: smallest/largest device + largest text screenshots; Android navigation HUD on screen | todo |

## Progress log (one line per item or slice)

- 2026-11-15 triage — ledger opened; baseline tests and parity audits started.

## Rulings (decisions taken without asking)

- 2026-11-15 "Lỗi" is taken as: failing baseline checks, the recorded review debt, and defects found by a parity audit — because the request names no specific bug; anything the owner saw on a device is asked below.
- 2026-11-15 Commit only mobile-app and this delivery folder by explicit path — because the index holds the owner's unrelated staged thesis and video files.

## Questions for the owner (only what nobody else can answer)

- Which specific bugs did you see on a device or simulator (screen, steps, what happened)? Work continues on the known list meanwhile.

## Cut scope and backlog findings

- (none yet)

## Retro

- (pending)
