---
description: Distill chats into the Obsidian SecondBrain (Codex memory). Use at the end of every turn that produced a decision, diagnosis, pattern, or code change — not only when the user mentions memory.
---

# Second Brain (Obsidian)

Vault: `~/Documents/Obsidian/SecondBrain` (symlinks to Codex memory). **Not** a folder in this git repo.

Write to:

`~/.Codex/projects/-Users-chinhtruongba-Documents-personal-AI-Powered-Driver-Assistant/memory/`

## Default: distill in the same turn

Before you finish **any** non-trivial turn, either:

1. Create/update a `snake_case.md` in that memory folder and wikilink it from `MEMORY.md` if new, or
2. The turn was a true one-liner / already captured — then do nothing.

A Cursor `stop` hook (`.cursor/hooks/require-distill.py`) will auto-prompt once if you edited the repo and skipped memory.

## What to write

Distill. Never paste the transcript.

- Filename: `snake_case.md`
- Wikilinks: `[[filename_stem]]` (not kebab YAML names — those become orphan graph nodes)
- Frontmatter: `name` = filename stem, `metadata.node_type: memory`, short `description`
- Prefer updating an evergreen note (`[[voice_runtime]]`, `[[service_layer]]`) over a new file

## Do not

- Secrets, `.env`, `credentials.json`
- Duplicate `Codex/docs/` tickets
- Create `second-brain/` inside the git repo
- Add a new project symlink without telling Chinh
