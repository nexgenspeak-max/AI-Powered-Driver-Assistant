---
name: requirements-gate
description: Ambiguity check to run before coding starts on any feature or change request in this repo. Catches missing behavior/contract/edge-case decisions up front so the task is implemented correctly on the first pass instead of requiring follow-up prompts to fix a wrong guess. Use at the start of any non-trivial coding task, before the Explore/Plan steps of dev-workflow.
---

# Requirements Gate

Most repeat-prompting happens because an ambiguity got silently guessed instead of surfaced. This gate runs once, at the very start of a task, before `dev-workflow`'s Explore/Plan steps.

## When to run this

Any request that will change behavior, an API/contract, or UI — i.e. anything `dev-workflow` would call "non-trivial." Skip for genuine one-liners (typo, single constant, obvious crash fix) where there's only one sane interpretation.

## Check for these ambiguity classes

Scan the request against this list. If **any** apply and can't be resolved by reading existing code, ask — don't guess and build.

1. **Behavior on the unhappy path** — what happens on missing/invalid input, a failed downstream call (e.g. voice-agent → trip-service HTTP failure), an empty result set? If the request doesn't say and no existing sibling endpoint/component sets the precedent, ask.
2. **Contract shape** — new/changed API field names, types, nullability; new function signature. Guessing wrong here means every caller written against it is also wrong.
3. **Scope boundary** — "fix the bug" or "add X" that could plausibly mean one file or a whole subsystem (e.g. "add Vietnamese support" — does it mean mirror an existing `vn/`+`en/` pair, or something narrower?). State your assumed scope explicitly if you proceed rather than picking silently.
4. **Cross-service or cross-app impact** — change to a shared contract (trip-service response shape, `context_store` keys) that other services/apps in the table (`dev-workflow` SKILL.md) also consume. If you can't verify every consumer still works, say so instead of asserting it does.
5. **Conflicting existing patterns** — two similar past implementations in the codebase disagree (e.g. one route validates with a schema, another does it manually). Ask which to follow rather than picking arbitrarily.
6. **Business/product rule not derivable from code** — pricing, fare rules, what counts as an "active" trip, compliance/legal constraint. Never guess these; they're only in the user's head or in `claude/*.md` docs — check those first, then ask if still unclear.

## How to resolve

- If the answer is derivable by reading more code (existing sibling pattern, an existing type definition, a doc in `claude/`), go read it — don't ask the user something the codebase already answers.
- If genuinely unresolvable from the repo, ask **one focused question** (use `AskUserQuestion` when options are enumerable) covering all the ambiguities found, not one round-trip per ambiguity.
- If you decide to proceed on a reasonable default instead of asking (low-stakes, easily changed later), state the assumption in one line before implementing, so the user can correct it before more work is built on top.

## Output

A one-line "scope + assumptions" statement (or a clarifying question) before moving into `dev-workflow`'s Plan step. Do not silently start editing files when an item above is unresolved.
