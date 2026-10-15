---
name: bug-fix
description: Root-cause-first workflow for fixing a reported bug anywhere in this repo (backend services or frontend apps) — reproduce, find the root cause, write a regression test that fails before the fix and passes after, then fix. Use whenever the user reports a bug, an unexpected behavior, a crash, or something "not working," instead of directly patching the symptom.
---

# Bug Fix

Patching symptoms without confirming the root cause is the other big source of repeat-prompting (the bug reappears in a slightly different form). This workflow replaces `dev-workflow`'s Implement step for bug reports specifically; still run `requirements-gate` first if the report is ambiguous about expected behavior.

## 1. Reproduce

Before editing anything, confirm you can see the bug:
- Find the exact code path from the report (route handler, tool, component).
- State the expected behavior vs. actual behavior in one line. If they're not actually different (misunderstanding, not a bug), say so and stop.
- If reproduction requires running the app and that's not feasible in the environment, reason through the code path manually and say explicitly that it wasn't runtime-reproduced.

## 2. Find the root cause, not the nearest symptom

- Trace backward from where the wrong behavior is observed to where it's introduced. A null-check that "fixes" a crash without asking why the value was null is a symptom patch, not a fix — prefer fixing why it's null, unless null there is legitimately expected and undocumented.
- Check whether the same bug class exists elsewhere from copy-paste (e.g. voice-agent's `vn/`+`en/` mirrored logic, or the same pattern repeated across `trip-service`/`call-center`/`call-logger`). If it does, note it — fix in scope, but don't silently leave a known-duplicate bug unmentioned.

## 3. Add a regression test first, when the project has a test setup

- **voice-agent** (has `tests/`): add/extend a test under `tests/` that reproduces the bug, confirm it fails, then fix, then confirm it passes.
- **TS backend services / frontend apps** (no test runner configured currently): no test-first step available — instead, after fixing, verify manually via the project's `dev`/`build` and, if UI-visible, exercise the actual flow. If the fix is significant enough to warrant a test and you believe the project should have one, say so rather than silently adding a new test framework/dependency.

## 4. Fix

Smallest change that addresses the root cause. Don't refactor the surrounding code while in there unless the refactor is the fix.

## 5. Verify

Run `dev-workflow`'s Verify step (build/lint/typecheck for every touched project) plus the regression test from step 3. Confirm the original repro from step 1 no longer occurs.

## 6. Report

State: what the root cause was (one line), what changed, and what was verified — including whether a regression test now guards it or why not.
