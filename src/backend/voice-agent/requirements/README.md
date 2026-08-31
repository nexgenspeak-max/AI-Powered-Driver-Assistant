# Voice Agent — Driver Support Requirements

Requirements for the **DriverAgent** voice assistant: what drivers can ask, how the AI should respond, and which tools/backends are involved.

**Primary language:** Vietnamese (`app/voicebot/locales/vn/`) — 37 inbound driver tools  
**Secondary:** English (`app/voicebot/locales/en/`) — full inbound parity (37 tools)  
**Locale service:** `app/services/locale/` — routing + YAML strings; **không thêm `if lang` trong processors**

---

## Documents

| File | Purpose |
|------|---------|
| [driver-tools-architecture-plan.md](./driver-tools-architecture-plan.md) | **Audited roadmap v1.1** — locale architecture, STT/TTS bundle, tool parity, migration phases, new tools |
| [driver-support-scope.md](./driver-support-scope.md) | Scope, agent modes, design principles |
| [faq-driver-vi.md](./faq-driver-vi.md) | Driver FAQ catalog (Vietnamese) — sample utterances |
| [faq-driver-en.md](./faq-driver-en.md) | Driver FAQ catalog (English) |
| [capability-matrix.md](./capability-matrix.md) | FAQ → tool → backend API → implementation status |
| [conversation-flows.md](./conversation-flows.md) | Multi-step flows (confirm before action, call modes, etc.) |
| [out-of-scope.md](./out-of-scope.md) | What the AI must not handle; escalation rules |
| [knowledge/](./knowledge/) | **RAG playbook** — `vi/` and `en/` MD sources for `answer_app_faq` |

---

## RAG FAQ playbook

General app / how-to questions use **`answer_app_faq`** + per-language indexes from `knowledge/vi/` and `knowledge/en/`.

```bash
cd src/backend/voice-agent
ENV=local python scripts/build_faq_index.py
```

See [knowledge/README.md](./knowledge/README.md).

---

## Agent modes

| Mode | Room pattern | Tools | Trigger |
|------|--------------|-------|---------|
| **Inbound** | `driver-{phone}-{ts}` | 18 tools (+ RAG FAQ) | Driver opens app → LiveKit WebRTC |
| **Outbound** | `trip-{id}` | `confirm_trip`, `reject_trip` | System notifies driver of new trip (SIP) |

Inbound is the main FAQ/support surface documented here.

---

## How to use this folder

1. **Product / thesis** — Use `faq-driver-vi.md` as the acceptance checklist for driver support.
2. **Prompt engineering** — Cross-check `tools_mapping.py` and `system_instructions.py` against FAQ categories.
3. **Backend work** — Use `capability-matrix.md` to prioritize trip-service APIs still missing.
4. **QA / demo** — Pick utterances from FAQ files and verify tool selection + spoken response.

---

## Related code

```
app/voicebot/locales/vn/agent.py              # DriverAgent tool list
app/voicebot/locales/vn/system_instructions.py
app/voicebot/locales/vn/tools_mapping.py      # keyword → tool hints for LLM
app/voicebot/locales/vn/tools_definition.py   # JSON schemas per tool
app/voicebot/locales/vn/tools/*.py            # Tool implementations
app/voicebot/locales/vn/yaml/*.yaml           # Spoken copy + NLU patterns
app/voicebot/registry.py                      # get_voicebot_module(lang)
app/services/locale/                          # resolve + load YAML
```
