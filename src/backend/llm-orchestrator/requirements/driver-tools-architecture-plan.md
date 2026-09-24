# Driver Voice Agent — Architecture & Tools Roadmap (Audited v1.2)

**Status:** Phase 1 started — `services/locale` + greeting YAML; processors still have legacy `if lang`  
**Date:** 2026-08-30  
**Audience:** Engineering, product, thesis evaluators  
**Languages in scope:** Vietnamese (`vn`), English (`en`) — extensible to `th`, `id`, … via locale packs only  
**Audit sources:** Code review + [Explore voice-agent i18n/tools](82f96f63-d47e-477f-9769-cf91460de784) subagent (2026-08-30)

Related: [driver-support-scope.md](./driver-support-scope.md) · [capability-matrix.md](./capability-matrix.md) · [driver-question-taxonomy.md](./driver-question-taxonomy.md) · [conversation-flows.md](./conversation-flows.md)

---

## 0. Executive summary

Mục tiêu: **hỗ trợ tài xế tối đa** bằng voice hands-free, với kiến trúc **một lần implement tool / processor**, **nhiều ngôn ngữ qua locale pack**, đổi ngôn ngữ **chủ yếu bằng env** (không sửa code khi thêm `th`).

**Hiện trạng (audit):**

| Area | Today | Gap vs target |
|------|--------|----------------|
| Tool impl | ~44 file `vn/tools/` + ~29 file `en/tools/` — hầu hết chỉ khác `lang="vi"` vs `lang="en"` | Duplicate, drift risk (VN có SMS/contact/custom call; EN thiếu nhiều tool) |
| Lang selection | `room.metadata.lang` default `vn`; **không có env driver lang** | User muốn `VOICE_AGENT_LANG=en` → chưa đủ |
| Fast-path / NLU | `spoken_intent.py`, `conversational_ack.py`, `pending_action.py` — pattern VN hardcode + `if lang == "en"` rải rác | Thêm ngôn ngữ = sửa nhiều file Python |
| Shared logic | `processors/` đã tốt (`trip_target`, `schedule_reply`, `tool_response`) | Giữ và mở rộng — đúng hướng |
| Backend APIs | 12+ endpoint trip-service **stub/missing** ([capability-matrix.md](./capability-matrix.md)) | Tool có code nhưng trả lỗi / empty |
| Tool count driver inbound | VN **37** registered; EN **24**; docs synced in capability-matrix | EN thiếu 13 tool vs VN (Phase 0 allow-list) |
| STT / TTS | `STT_LANGUAGE`, `GOOGLE_TTS_VOICE` — **global env**, không đổi theo session | Session `lang=en` vẫn dùng vi-VN STT/TTS trừ khi đổi env worker |
| Lang code duality | Routing: `vn`/`en`; formatters/RAG: `vi`/`en` | Thêm `th` cần mapping thống nhất (`session_lang.py`) |
| Driver room metadata | `trip-service` `POST /voice/token` **không gửi `lang`** | Mọi inbound driver session mặc định `vn` dù app/user chọn EN |
| Turn detection | VN: `turn_detection=None`; EN: `MultilingualModel()` | Thai cần verify LiveKit detector tương tự VN |
| speech_text_fix | VN-centric (đồng, lot numbers) | EN/TH cần locale pack riêng hoặc bypass |

**Khuyến nghị:** 4 phase migration (12–16 tuần có thể song song backend + refactor), **không big-bang**. Phase 0–1 không phá session production.

---

## 1. Design principles (validated)

1. **Tool logic once** — HTTP, context_store, trip resolution, call modes → một module; locale chỉ cung cấp lời nói + schema description + STT patterns.
2. **Locale = data, not code** — YAML/JSON cho: greeting, silence prompts, spoken-intent phrases, tool keyword mapping, FAQ index path.
3. **Env-first language** — single source: `VOICE_AGENT_LANG` (worker) with optional per-session override from app metadata.
4. **No deep if/else trees** — `Locale.get("farewell.patterns")`, `registry.get_tool("check_upcoming_trips")`; branch chỉ tại router mỏng.
5. **Contract before code** — mỗi tool mới: FAQ ID → schema → processor → trip-service route → test replay step.
6. **Driver safety** — giữ [conversation-flows.md](./conversation-flows.md) F1–F8; confirm trước hủy / no-show / gọi.

---

## 1.1 Maintenance rules (EN/VN — bắt buộc)

**Mục tiêu:** sau này thêm `th` / đổi copy **không sửa processor Python**.

| ✅ Đúng | ❌ Cấm |
|--------|--------|
| Copy nói (greeting, silence, confirm…) trong `locales/{vn,en}/*.yaml` | `if lang == "en": return "..."` trong `processors/` |
| Logic nghiệp vụ một lần trong `processors/` + `tools/` (lang-agnostic) | Duplicate `vn/tools/foo.py` + `en/tools/foo.py` chỉ đổi chuỗi |
| Resolve lang qua `app.services.locale` | `normalizeVoiceLang` inline trong route handler |
| Agent/prompt/tool schema qua `get_voicebot(routing)` hoặc registry | Mic STT bundle EN trong khi agent VN (hoặc ngược lại) |
| trip-service: `services/voiceLang` → room metadata `lang` | Auto-detect locale iPhone → `lang=en` khi product VN-primary |

**Module map (đã có / target):**

```
voice-agent/
  app/services/locale/          ← resolve routing, SessionLocale, load YAML sections
  app/voicebot/locales/         ← manifest + vn/en/*.yaml (data only)
  app/voicebot/session_lang.py  ← thin re-export (deprecated import path)
  app/voicebot/registry.py      ← get_voicebot_module, get_inbound_tools (SOLID dispatch)
  app/voicebot/__init__.py      ← get_voicebot → registry

driver-app/
  src/services/voiceLang/     ← user choice vn|en (persisted, NOT device locale)
  app/voicebot/processors/      ← business logic; strings từ load_locale_section()
  app/voicebot/tools/           ← (target) one impl per tool

trip-service/
  src/services/voiceLang/       ← normalize + default vn
  src/routes/voice.ts           ← gọi service, merge lang vào room metadata
```

**Migration từng file:** khi chạm processor có `if lang == "en"`, tách chuỗi sang YAML trước — không thêm nhánh mới.

**Exemplar (Phase 1):** `driver_greeting.py` + `locales/{vn,en}/greeting.yaml` — không còn if/else copy.

---

## 1.2 SOLID audit (2026-08-30) — hiện trạng vs target

**Product contract:** `vn` = thị trường Việt Nam (prompt vi, STT vi-VN, TTS vi); `en` = người dùng chọn English (prompt en, STT en-US, TTS en). Người dùng chọn trên app (`assistant-settings` → `voiceLangStore`); backend **không** suy luận từ locale máy.

| SOLID | Hiện trạng | Target / đã làm |
|-------|-----------|-----------------|
| **S** Single responsibility | `spoken_intent.py` (~800 LOC) = NLU + strings + dispatch | Tách `spoken_intent/router.py` + YAML patterns |
| **O** Open/closed | Thêm `th` = sửa 20+ processor `if lang` | Thêm `locales/th/` + manifest; registry load module |
| **L** Liskov | `vn/agent.DriverAgent` ≈ `en/agent.DriverAgent` (duplicate) | Một `DriverAgent` factory nhận `SessionLocale` |
| **I** Interface segregation | `SpokenIntentMixin` + `SpeechTextFixMixin` gắn lang | Composition theo locale bundle, không mixin lang |
| **D** Dependency inversion | Tool gọi trực tiếp `vn.tools_definition` | Tool nhận schema từ `registry.get_inbound_tools(lang)` |

**Vi phạm cần migrate (đếm 2026-08-30):**

| Area | Files | Issue |
|------|-------|-------|
| Duplicate tools | 43 `vn/tools` + 40 `en/tools` | ~95% giống nhau, chỉ khác `lang="vi"` vs `"en"` |
| Processor if/else | 15+ files (`customer_call`, `schedule_reply`, `nudge`, …) | Copy EN/VN inline |
| Legacy mixin registry | `app/tools/registry.py` (customer SIP) | OK cho customer agent — **không** dùng cho driver lang |
| Driver lang dispatch | ~~`tool_registry if vn else en`~~ | ✅ `voicebot/registry.py` |
| App → backend lang | ~~thiếu UI chọn ngôn ngữ~~ | ✅ `voiceLangStore` + `?lang=` token |
| STT/TTS bundle | Global env only | Worker phải match user lang (restart env bundle) |

**Luồng end-to-end (target):**

```
driver-app voiceLangStore (user choice vn|en)
  → POST /voice/token?lang=
  → trip-service services/voiceLang → room.metadata.lang
  → voice-agent services/locale.resolve_session_locale()
  → voicebot/registry.get_voicebot_module(lang)
  → vn|en agent + tools + prompts (full bundle)
```

**Phase roadmap (thực thi, không hỏi lại):**

| Phase | Deliverable | Status |
|-------|-------------|--------|
| 0 | Parity 37 tools, lang metadata, locale service scaffold | ✅ |
| 1a | registry + greeting YAML + app lang picker | ✅ in progress |
| 1b | spoken_intent → YAML router | 🔲 |
| 2 | Merge duplicate tools → `voicebot/tools/` one impl | 🔲 |
| 3 | Processor strings → locale YAML (batch) | 🔲 |

---

## 2. Target folder structure

```
app/voicebot/
├── registry.py                 # Tool catalog, locale loader, get_agent(lang)
├── session_lang.py             # re-export → app.services.locale (compat)
│
├── tools/                      # ONE impl per tool (lang-agnostic) — target
│   ├── check_upcoming_trips.py
│   ├── call_customer.py
│   ├── end_session.py          # merge end_conversation + end_call
│   └── ...
│
app/services/locale/            # ★ canonical lang service (import from here)
│   ├── __init__.py             # resolve_session_locale, load_locale_section, …
│   ├── resolver.py             # vn/en routing, vi/en spoken mapping
│   ├── loader.py               # manifest + YAML sections
│   └── session.py              # SessionLocale bundle
│
├── processors/                 # (existing) shared business logic — unchanged role
│   ├── context_store.py
│   ├── trip_target.py
│   ├── schedule_reply.py
│   ├── spoken_intent/          # split from monolith
│   │   ├── router.py           # classify + execute, no locale strings
│   │   └── intents.py          # intent enum + dispatch table
│   └── ...
│
├── locales/
│   ├── manifest.yaml           # supported langs, default, STT/TTS codes
│   ├── vn/
│   │   ├── yaml/               # ★ locale copy + NLU patterns (data only)
│   │   │   ├── greeting.yaml
│   │   │   ├── spoken_intent.yaml
│   │   │   ├── conversational.yaml
│   │   │   └── …
│   │   └── (future: tools_definition.json if not under yaml/)
│   └── en/
│       └── yaml/               # mirror vn/yaml/
│
├── prompts/                    # (existing) ToolResponse builders — lang param stays
└── testing/
    ├── trip_tool_verify.py
    └── conversation_replay/    # per-locale replay cases
```

**Deprecate (sau migration):** thin wrappers `voicebot/vn/`, `voicebot/en/` (shim re-export only).

**Layout (2026-08-30):**

```
app/voicebot/locales/
├── manifest.yaml
├── vn/
│   ├── yaml/                 # greeting, spoken_intent, …
│   ├── agent.py
│   ├── constants.py
│   ├── tools/
│   └── …
└── en/
    └── (mirror)
```

**Giữ tạm:** `voicebot/vn/__init__.py`, `voicebot/en/__init__.py` — shim → `locales.{vn,en}`.

---

## 3. Language resolution contract (env + cross-service)

### 3.0 Hai hệ mã ngôn ngữ (audit finding)

| Layer | Codes | Files |
|-------|-------|-------|
| Session routing | `vn`, `en` | `get_voicebot()`, `userdata["lang"]`, `SpokenIntentMixin._spoken_intent_lang` |
| Spoken / format / RAG | `vi`, `en` | `trip_format.py`, `tool_reply.lang_code()`, `FAQ_LANGUAGES` |

**Plan:** `session_lang.py` map một chiều: `vn → vi`, `en → en`, `th → th`. Mọi processor nhận **spoken code** (`vi`), không nhận routing code.

### 3.1 Environment variables (worker `.env`)

| Variable | Values | Purpose |
|----------|--------|---------|
| `VOICE_AGENT_LANG` | `vn` \| `en` | **Default** agent locale for all driver sessions |
| `STT_LANGUAGE` | `vi-VN`, `en-US`, … | Google STT BCP-47 (**global per worker**) |
| `TTS_VOICE` / provider voice id | per lang | TTS voice (**global per worker**) |
| `FAQ_INDEX_LANG` | auto from `VOICE_AGENT_LANG` | RAG index path `knowledge/{vi\|en}/` |

**Locale bundle (target):** `locales/manifest.yaml` khai báo bộ env đi kèm mỗi lang:

```yaml
vn:
  routing: vn
  spoken: vi
  stt: vi-VN
  tts_voice: vi-VN-Chirp3-HD-Kore
en:
  routing: en
  spoken: en
  stt: en-US
  tts_voice: en-US-Chirp3-HD-Kore
```

**“Đổi env là xong”** = đổi **bundle** (`VOICE_AGENT_LANG` + `STT_LANGUAGE` + `TTS_VOICE`) rồi restart worker. Prompt/tools/strings theo bundle; không cần sửa Python.

### 3.2 Resolution order (documented, tested)

```
effective_lang =
  room.metadata.lang          # per-driver app setting (optional)
  ?? settings.voice_agent_lang  # from VOICE_AGENT_LANG env
  ?? "vn"
```

**Gap today:**

- `session.py` L273 chỉ đọc `meta.lang`; chưa fallback env.
- `trip-service/src/routes/voice.ts` L122–127 — room metadata có nudge payload, **không có `lang`**.
- `driver-app` chưa gửi `lang` khi lấy token.

**Cross-service contract (Phase 0):**

| Service | Change |
|---------|--------|
| `trip-service` `POST /voice/token` | Accept `?lang=vn\|en` or body field; merge vào room metadata |
| `driver-app` | Gửi `lang` từ user profile / app locale |
| `voice-agent` `settings.py` | `voice_agent_lang` from `VOICE_AGENT_LANG` |
| `voice-agent` `session.py` | Fallback chain §3.2 |

Per-session override (user chọn EN trong app) vẫn cần **STT/TTS bundle EN** trên worker — hoặc Phase 2+ per-session provider config nếu product yêu cầu mixed-lang trên cùng worker.

---

## 4. Tool architecture pattern

### 4.1 Single tool handler

```python
# tools/check_upcoming_trips.py (conceptual)
@function_tool(schema_from_locale)  # decorator loads schema by runtime lang
async def check_upcoming_trips(args: dict, ctx: RunContext) -> str:
    lang = resolve_spoken_lang(ctx.userdata)  # "vi" | "en"
    reply = format_schedule_reply(ctx.userdata, args, lang=lang)
    return await context_store.speak_with_refresh_offer(...)
```

Locale file chỉ thay: `description`, `parameter descriptions`, `tools_mapping` keywords.

### 4.2 Tool registry

`registry.py`:

- `DRIVER_INBOUND_TOOLS: list[str]` — canonical names
- `load_tools(lang) -> list[Callable]` — bind schemas from `locales/{lang}/tools_definition`
- `parity_check()` — CI assert VN and EN expose same tool **names**

### 4.3 Spoken intent → data-driven

Thay `_UPCOMING_VN`, `_END_VN`, … trong Python bằng:

```yaml
# locales/vn/spoken_intent.yaml
intents:
  end_conversation:
    any_contains: [tắt máy, tạm biệt, thế thôi]
    all_groups:
      - [thế thôi, cảm ơn]
  upcoming:
    any_contains: [lịch trình, kiểm tra trình, mấy chuyến]
  trip_lookup:
    requires_match: trip_target   # call resolve_trips_from_text
    any_contains: [chuyến nào, khách nào]
```

`router.py` đọc YAML theo `effective_lang` — thêm `th` = thêm file, **không sửa router**.

---

## 5. Tool inventory audit

### 5.1 Driver inbound — registered today (code audit 2026-08-30)

| Tool | VN | EN | Shared processor | Backend API |
|------|:--:|:--:|------------------|-------------|
| check_upcoming_trips | ✅ | ✅ | schedule_reply | ✅ |
| refresh_latest_data | ✅ | ✅ | prefetch | ✅ |
| get_current_trip_info | ✅ | ✅ | trip_response | ✅ |
| suggest_next_stop | ✅ | ✅ | route | ⚠️ |
| get_optimal_route | ✅ | ✅ | route | ⚠️ |
| get_trip_traffic | ✅ | ✅ | traffic | ⚠️ partial |
| confirm_trip / reject_trip (inbound) | ✅ | ❌ | confirm_trip_flow | ✅ — EN chỉ có ở outbound toolset |
| update_trip_status | ✅ | ✅ | status | ✅ |
| request/confirm_cancel_trip | ✅ | ✅ | cancel flow | ✅ |
| call_customer | ✅ | ✅ | customer_call | ⚠️ call-center |
| call_custom_number + confirm | ✅ | ❌ | custom_call | ⚠️ |
| find_contact + confirm_call | ✅ | ❌ | contact_call | ⚠️ |
| send_sms_* (customer/custom/contact) | ✅ | ❌ | sms | ❌ stub |
| get_customer_location | ✅ | ✅ | location | ❌ |
| confirm_trip_with_customer | ✅ | ✅ | sms template | ❌ |
| summarize_last_call | ✅ | ✅ | call summary | ❌ |
| check_customer_call_status | ✅ | ✅ | call_status | ⚠️ |
| create_reminder | ✅ | ✅ | reminder | ❌ |
| extend_wait_time | ✅ | ✅ | wait | ❌ |
| report_customer_no_show | ✅ | ✅ | incident | ❌ |
| report_trip_issue | ✅ | ✅ | incident | ❌ |
| get_today_earnings | ✅ | ✅ | earnings | ❌ |
| get_driver_stats | ✅ | ✅ | stats | ❌ |
| get_bonus_info | ✅ | ✅ | bonus | ❌ |
| set_driver_status | ✅ | ✅ | availability | ⚠️ |
| answer_app_faq | ✅ | ✅ | RAG | ✅ |
| end_conversation / end_call | ✅ | ✅ | session_control | ✅ |

**Audit finding:** EN thiếu **11 tool** so với VN inbound. Docs [README.md](./README.md) ghi “same capability” — **sai so với code**. Taxonomy vẫn ghi arbitrary contact ❌ trong khi VN đã có `find_contact` — **docs lag code**.

**VN-only fast paths (cần locale YAML khi refactor):** `driving_advice.py`, `_is_trip_identity_query` trong `spoken_intent.py`, `conversational_ack.py` phrase sets.

### 5.2 Tools to ADD (driver value, in scope)

Priority from [driver-question-taxonomy.md](./driver-question-taxonomy.md) + live session gaps:

| P | Tool | Driver ask | Depends on |
|---|------|------------|------------|
| **P0** | *(none new)* — fix **EN parity** + **backend stubs** for existing tools | — | trip-service |
| **P1** | `get_earnings_summary` | "Tuần này kiếm bao nhiêu?" / "This week?" | `GET /drivers/me/earnings/summary?period=week` |
| **P1** | `get_trip_detail` (explicit) | Follow-up giá/giờ/đón — không cần LLM đoán | Already partially `check_upcoming_trips(trip_index)` — expose as intent + doc |
| **P1** | `refresh_trip_traffic` | "Kẹt xe giờ thế nào?" re-query | Maps API wrapper in trip-service |
| **P2** | `get_weekly_stats` | Chuyến tuần, acceptance rate trend | profile API extension |
| **P2** | `repeat_last_summary` | "Nói lại" / "Repeat that" | context_store last spoken |
| **P2** | `navigate_to_pickup` | Mở Maps deep link (app RPC) | driver-app handler, not turn-by-turn |
| **P3** | `get_payout_status` | "Tiền về ví chưa?" | payments service (future) |

**Out of scope (do not tool):** xăng, thời tiết, pháp luật chi tiết, gọi số tùy ý ngoài danh bạ/platform — [out-of-scope.md](./out-of-scope.md).

### 5.3 Backend API priority (unblocks tools)

From [capability-matrix.md](./capability-matrix.md), ordered:

1. **P0** — `GET /trips/{id}/location`, call-logger `GET /calls/latest`
2. **P1** — `POST no-show`, `POST extend-wait`, `POST issues`, earnings today/summary
3. **P2** — reminders, bonuses, profile stats, confirm-with-customer SMS

---

## 6. Migration phases

### Phase 0 — Stabilize & parity (1–2 weeks, no refactor)

**Goal:** Production behavior đúng trước khi đổi cấu trúc.

| Task | Done when |
|------|-----------|
| EN agent register same tools as VN (or explicitly document subset) | `parity_check` script lists diff = 0 or approved |
| `VOICE_AGENT_LANG` env + session fallback | Integration test: env=en → English greeting |
| **trip-service** pass `lang` in room metadata; **driver-app** send `lang` | E2E: profile EN → English agent despite default vn |
| Document **STT/TTS env bundle** per lang in `.env.example` | README states worker must restart with matching STT/TTS |
| Update capability-matrix + scenario counts | Docs match `vn/agent.py` tool list (35 inbound) |
| Replay tests per flow F1–F8 | `conversation_replay` ≥ 15 steps, VN + EN |
| Backend P0 APIs | location + call latest return real data in dev |

**Risk:** Low — additive.

### Phase 1 — Locale extraction (2–3 weeks)

**Goal:** Move strings/patterns out of Python without moving tool bodies yet.

| Task | Done when |
|------|-----------|
| Create `locales/vn/*.yaml`, `locales/en/*.yaml` | spoken_intent, tools_mapping, greetings loaded from YAML |
| `spoken_intent/router.py` reads locale patterns | Adding pattern = YAML edit only |
| `manifest.yaml` + `get_locale(lang)` | Invalid lang → 400 at startup |
| CI: `test_locale_parity.py` — same intent keys in vn/en | All intents have EN patterns |

**Risk:** Medium — regression on fast-path; mitigate with replay tests.

### Phase 2 — Unified tools/ (3–4 weeks)

**Goal:** Delete duplicate vn/en tool files.

| Task | Done when |
|------|-----------|
| Move handlers to `voicebot/tools/` | One file per tool |
| Schemas from `locales/{lang}/tools_definition` | `@function_tool` dynamic schema |
| Shims `vn/tools/X.py` re-export deprecated | Warning log once per tool |
| `trip_tool_verify` + pytest green | 99+ cases pass |

**Risk:** Medium-high — LiveKit tool registration; feature-flag `USE_UNIFIED_TOOLS=true`.

### Phase 3 — New tools + backend (4–6 weeks, parallel)

**Goal:** Maximum driver support per taxonomy.

| Task | Done when |
|------|-----------|
| `get_earnings_summary` + trip-service route | FAQ T-week covered |
| `refresh_trip_traffic` | Live traffic re-query |
| driver-app `navigate_to_pickup` RPC | Voice triggers Maps |
| FAQ + playbook updates both langs | `build_faq_index.py` both indexes |
| Manual iPhone matrix 80 scenarios | [scenario.md](./scenario.md) checklist |

---

## 7. Testing & audit gates

### 7.1 Per-tool definition of done

- [ ] Locale: VN + EN schema + mapping keywords
- [ ] Processor unit test (mock HTTP)
- [ ] Replay step in `conversation_replay` (from real log or FAQ utterance)
- [ ] DEV log: `event=tool name=… ok=… duration_ms=…`
- [ ] Empty / error / timeout paths spoken in driver language
- [ ] capability-matrix row updated

### 7.2 Per-locale definition of done

- [ ] All `spoken_intent` intents defined
- [ ] Greeting + silence + goodbye strings
- [ ] RAG index built (`knowledge/{vi|en}/`)
- [ ] STT/TTS env documented in `.env.example`
- [ ] 10-min manual session: schedule → detail → call → end (no raw tool tokens in chat)

### 7.3 CI commands (target)

```bash
cd src/backend/llm-orchestrator
pytest tests/test_spoken_intent.py tests/test_conversation_replay.py tests/test_locale_parity.py
python -m app.voicebot.testing.trip_tool_verify
python scripts/check_tool_parity.py   # new
```

---

## 8. Anti-patterns to eliminate

| Anti-pattern | Where today | Replacement |
|--------------|-------------|-------------|
| Duplicate tool file vn/en | `check_upcoming_trips.py` ×2 | Single `tools/` + lang param |
| `_tool(lang, vn_path, en_path, name)` | spoken_intent.py | registry.get("call_customer") |
| `if lang == "vn": … else: …` in processors | customer_call, contact_call | `locale.messages["calling"]` |
| Hardcoded VN-only fast-path | pending_action `_EXECUTE_NUDGE_VN` | locale YAML |
| Lang only from room meta | session.py | env fallback + app override |
| Docs say 17 tools, code has 35 | requirements/ | Auto-generate tool list from registry |

---

## 9. Adding language `th` (validation checklist)

When Phase 1–2 complete, adding Thai requires **zero Python tool changes**:

1. Add `locales/th/` (copy en structure, translate)
2. Add `knowledge/th/` + run `build_faq_index.py`
3. Set `VOICE_AGENT_LANG=th`, `STT_LANGUAGE=th-TH`, TTS voice
4. Register `th` in `manifest.yaml`
5. Run `test_locale_parity.py` + 5 manual utterances

**Estimated effort:** 3–5 days translation + QA (not 3–5 weeks refactor).

---

## 10. Immediate next steps (recommended sprint 1)

1. **Spec:** Approve this document + Phase 0 scope.
2. **Env:** Add `VOICE_AGENT_LANG` to `settings.py` + `.env.example` + session fallback; document **STT/TTS env bundle** per lang.
3. **Cross-service:** `trip-service` `POST /voice/token` + `driver-app` pass `lang` in room metadata.
4. **Parity:** Script diff VN (35) vs EN (24) tool lists; port missing EN tools or hide from VN until ready.
5. **Backend:** Implement `GET /trips/{id}/location` (P0).
6. **Tests:** Add EN replay cases for end_session + trip_lookup (mirror recent VN fixes).
7. **Do NOT start** Phase 2 unified tools until Phase 0 replay green on device.

---

## 11. Audit sign-off

| Check | Result |
|-------|--------|
| Aligns with driver-support-scope 10 categories | ✅ |
| Respects out-of-scope boundaries | ✅ |
| Covers conversation-flows F1–F8 | ✅ (no flow change in refactor) |
| Explains env-only lang switch | ✅ (with STT/TTS bundle + app/trip-service contract) |
| Documents vn/vi code duality | ✅ (§3.0) |
| Reduces if/else via locale packs | ✅ |
| New tools prioritized by taxonomy + matrix | ✅ |
| Migration phased, reversible | ✅ |
| EN/VN parity gap explicitly called out | ✅ (35 vs 24 inbound) |
| Subagent i18n audit incorporated | ✅ |

**Version:** 1.1 — incorporates [Explore voice-agent i18n/tools](82f96f63-d47e-477f-9769-cf91460de784) findings (STT/TTS global, trip-service no lang, dual codes).  
**Next review:** After Phase 0 complete or before Phase 2 cutover.
