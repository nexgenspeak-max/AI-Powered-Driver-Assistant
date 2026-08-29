# Agent autonomy (this repo)

Chinh wants **zero Run / Accept friction** while working here.

## Required Cursor settings (once per machine)

1. **Cursor Settings → Agents → Approvals & Execution**
2. **Run Mode → Run Everything**
3. **Auto-apply edits → ON** (stops per-file Accept prompts)
4. `Cmd+Shift+P` → **Developer: Reload Window**

## Project file

`.cursor/permissions.json` — MCP allow-all (`*:*`) + `autoRun` hints for Auto-review fallback.

**Do not re-add `terminalAllowlist`** unless you intentionally want Allowlist mode again; a repo-level terminal allowlist overrides the IDE and brings Run prompts back for anything outside the list.

## Still safe by default

`autoRun.block_instructions` keeps force-push to main, secret commits, and destructive teardown as classifier block hints (Auto-review only).
