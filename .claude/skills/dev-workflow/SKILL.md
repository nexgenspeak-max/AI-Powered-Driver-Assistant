---
name: dev-workflow
description: Standard end-to-end workflow for any coding task in this repo (backend services under src/backend/*, frontend apps under src/frontend/*). Enforces Explore → Plan → Decide → Implement → Self-review → Verify (build/lint/typecheck/test) → Report, following each project's own conventions and a security/quality checklist, before any task is reported done. Use whenever implementing a feature, fixing a bug, or making any non-trivial code change in this repository.
---

# Dev Workflow

Repo layout (see `.cursor/rules/project-structure.mdc` for the authoritative version):

| Project                                              | Path                        | Run/build                                     | Stack conventions                      |
| ----------------------------------------------------- | ----------------------------- | ------------------------------------------------ | ----------------------------------------- |
| auth-service, call-center, call-logger, trip-service | `src/backend/<service>`      | `npm run dev` / `npm run build`               | `.cursor/rules/typescript-backend.mdc` |
| voice-agent                                          | `src/backend/voice-agent`    | uv/python, `tests/` (e.g. `smoke_test.py`)    | `.cursor/rules/python-voice-agent.mdc` |
| admin-panel, customer-web, driver-web                | `src/frontend/<app>`         | `npm run dev` / `build` / `typecheck` / `lint` | Vite + React                           |
| agents-playground                                    | `src/frontend/agents-playground` | `npm run dev` / `build` / `lint`             | Next.js                                |
| customer-app, driver-app, mobile-app                 | `src/frontend/<app>`         | `npm run start` / `android` / `ios`           | Expo/React Native                      |

This is a **checklist workflow**: copy the task-progress block below into your working notes for any non-trivial change (skip it only for a genuine one-liner) and work through it top to bottom. Do not report a task done with any unchecked, failing, or skipped-without-explanation item.

```text
Task Progress:
- [ ] Explore: found relevant files, read the surrounding pattern, checked stack-specific rules
- [ ] Plan: scope and approach stated (for non-trivial changes)
- [ ] Decide: open technical choices resolved, rationale noted
- [ ] Implement: change made, matches project conventions
- [ ] Self-review: diffed own change against the checklist below
- [ ] Verify: build/lint/typecheck/tests run and passing for every touched project
- [ ] Report: concise summary of what changed and what was verified
```

## 1. Explore

Before touching code:
- Identify every project (from the table above) the request touches — a feature can span a backend service and a frontend app.
- Search the codebase for the existing pattern this change should follow (similar route, similar component, similar tool). Don't guess structure — read it.
- Read the relevant `.cursor/rules/*.mdc` file for the stack you're editing if you haven't already internalized it this session; it documents this repo's actual conventions (import order, control-flow style, file-per-concern, naming), not generic style.

## 2. Plan

For any change touching more than one file, or with more than one reasonable approach, state briefly before coding:

- The smallest change that satisfies the request. No speculative abstractions, no unrequested refactors, no scope creep into adjacent cleanup.
- Which files will be added/edited, and why those.

For a true one-liner (typo, single constant, single obvious bug), skip straight to Implement.

## 3. Decide

For each point with more than one reasonable resolution (data shape, which layer owns the logic, naming, error-handling boundary, cache invalidation point): pick one, state the reason in one line, move on. Don't lay out every option for the user unless genuinely blocked.

Stop and ask the user only when the decision requires information only they have: a business rule, a credential/secret, or a choice between two *conflicting existing patterns already in the codebase* (not a choice you can resolve by reading more code).

## 4. Implement

Follow the stack-specific rule file for the project you're editing (see table). Highlights already codified there:

- **TS backend**: routes stay thin (validate → call service → map response), business logic lives in `services/*.ts`, early-return with braces (no single-line `if`), imports at top, invalidate relevant cache after writes.
- **Python voice-agent**: one tool per file, guard clauses over nested conditionals, imports at top (stdlib → third-party → local), no business logic in `agent.py`/`system_instructions.py`, tools read via `context_store`.
- **Frontend apps**: match the existing component/hook structure in the specific app; each app (admin-panel, customer-web, driver-web, agents-playground, the Expo apps) may diverge — check its own `tsconfig`/`eslint` config rather than assuming a repo-wide rule.

Prefer editing existing files over creating new ones; one concern per file (per `project-structure.mdc`); no duplicate logic — reuse shared modules (e.g. `processors/`, `prompts/` in voice-agent).

## 5. Self-review

Before running verification, diff your own change and check for the common defect classes (OWASP-aligned, scoped to what's realistic in this codebase):

- Correctness: edge cases (empty/null trip data, missing driver context, lang split vn/en both updated if one was).
- Security: no injected strings into DB/HTTP calls without validation, no secrets/keys committed, no unvalidated input trusted across a service boundary (voice-agent → trip-service is HTTP, not direct DB access).
- Leftovers: no debug `console.log`/`print`, no commented-out code, no unused imports.
- Consistency: naming and file placement match the table/rules above.

## 6. Verify — mandatory before declaring done

Run the checks for every project touched. "The code looks right" is not verification — run it.

**TS/Node backend service** (`src/backend/<service>`):

```bash
npm run build
```

**Python voice-agent** (`src/backend/voice-agent`): run the relevant tests under `tests/` (e.g. `pytest tests/smoke_test.py` or the full suite); for changes to entry points, sanity-check the app still imports/starts.

**Vite frontend** (`admin-panel`, `customer-web`, `driver-web`):

```bash
npm run typecheck   # customer-web, driver-web
npm run build        # admin-panel (build includes tsc)
npm run lint
```

**Next.js app** (`agents-playground`):

```bash
npm run lint
npm run build
```

**Expo app** (`customer-app`, `driver-app`, `mobile-app`): no headless build — for UI changes, start the app (`npm run start` or platform script) and exercise the changed screen/flow. If that isn't possible in the current environment, say so explicitly rather than claiming it was tested.

If a check fails, fix the root cause and re-run. Never report done with a known-failing or skipped check — state exactly what wasn't verified and why if something genuinely can't be run.

## 7. Report

Only after verification passes: summarize what changed and what was verified, in 1-2 sentences. Don't produce planning/decision write-ups as separate files — plan and decisions live in the conversation, not in new docs, unless the user explicitly asks for a document.
