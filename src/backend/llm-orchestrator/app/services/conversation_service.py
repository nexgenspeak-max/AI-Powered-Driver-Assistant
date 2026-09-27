"""
ConversationService — records every turn, generates a Vietnamese summary,
and POSTs the call record to call-logger when the session ends.
"""
import asyncio
import json
import logging
import time
import re
from datetime import datetime, timezone

import httpx
from livekit.agents import AgentSession, JobContext
from livekit.agents.llm import ChatMessage

from app.config.settings import get_settings
from app.services import session_metrics
from app.devlog import event as dev_event
from app.services.service_token import auth_headers

logger = logging.getLogger("llm-orchestrator.conversation")

# Sub-call relay from driver-app during bridge mode — server STT only hears
# the driver; customer speech arrives on the client from the SIP participant.
CALL_TRANSCRIPT_TOPIC = "call_transcript"

# _post_record retry: call-logger being briefly unreachable (still starting
# up, a network blip) used to mean the record was gone for good — one warning
# log and nothing else, no second attempt. These are short/local backoffs
# (not meant to survive a genuinely down service for minutes), just enough
# to ride out a transient hiccup instead of silently losing the transcript.
_POST_RECORD_RETRY_DELAYS_SECONDS = (1.0, 3.0)

_ROOM_RE = re.compile(r"^driver-(\d+)-\d+$")  # in-app WebRTC: driver-84867347452-1748700000
# Real inbound phone call (LiveKit SIP dispatch rule, room_prefix="driver-call-"
# in scripts/setup_sip.py): driver-call-_+84867347452_abc. Duplicated from
# app/agent/session.py's _DRIVER_CALL_RE — this module can't import from
# session.py (session.py imports ConversationService, so importing back would
# be circular) — keep both in sync if the SIP room-naming ever changes.
# Without this, `self.caller` fell through to the "unknown"/first-fallback
# branch below and every real-phone-call record got saved with
# caller="call" (the literal word, from splitting "driver-call-..." on "-")
# instead of the actual phone number — the record itself still landed in
# local-driver-assistant-call-records same as any app session, just with a
# wrong `caller` value that made it unfindable by driver phone number.
_DRIVER_CALL_RE = re.compile(r"^driver-call-_\+?(\d+)_")


class ConversationService:
    def __init__(self, ctx: JobContext) -> None:
        self.ctx = ctx
        self.turns: list[dict] = []
        self.started_at = datetime.now(timezone.utc).isoformat()

        m = _ROOM_RE.match(ctx.room.name) or _DRIVER_CALL_RE.match(ctx.room.name)
        self.caller = m.group(1) if m else ctx.room.name.split("-")[1] if "-" in ctx.room.name else "unknown"
        # Overridden in attach() for isolated (custcall) rooms — see there for
        # why the driver-room-shaped defaults above don't apply to those.
        self._call_id = ctx.room.name
        self._is_customer_call = False
        # Set once finish()/finish_and_get_summary() has actually persisted a
        # record — guards against saving (and re-generating a summary via a
        # second, possibly differently-worded LLM call) twice for the same
        # call: isolated-call callers save early via finish_and_get_summary()
        # (see its own docstring) so the driver hears a summary that's
        # guaranteed to match what's actually in DynamoDB; session.py's own
        # finish() still runs later during job teardown regardless, and would
        # silently duplicate that work without this flag.
        self._finished = False

    @property
    def call_id(self) -> str:
        return self._call_id

    def _speaker_for_role(self, userdata: dict, role: str) -> str:
        if role == "assistant":
            return "ai"
        if userdata.get("bridge_call_active"):
            return "driver"
        if userdata.get("customer_call_active"):
            return "customer"
        if self._is_customer_call:
            return "customer"
        return "driver"

    def append_labeled_turn(
        self,
        text: str,
        *,
        speaker: str,
        role: str | None = None,
        ts: float | None = None,
    ) -> None:
        clean = (text or "").strip()
        if not clean:
            return
        role = role or ("assistant" if speaker == "ai" else "user")
        entry = {
            "role": role,
            "speaker": speaker,
            "text": clean,
            "ts": ts or time.time(),
        }
        if self.turns and self.turns[-1].get("text") == clean and self.turns[-1].get("speaker") == speaker:
            return
        self.turns.append(entry)
        logger.info("  [%s] %s", speaker.upper(), clean[:120])

    def attach(self, session: AgentSession) -> None:
        userdata = session.userdata
        if userdata.get("isolated_call"):
            # custcall-* rooms: _ROOM_RE never matches (that regex is
            # driver-<phone>-<ts> only), so `caller` fell back to a
            # meaningless trip-id fragment (custcall.split("-")[1]), and the
            # record was POSTed under call_id=ctx.room.name — a DIFFERENT
            # value than trip-service's own call_id
            # ("{room_name}-{sip_identity}", see callService.ts), which is
            # what the driver-facing "tóm tắt cuộc gọi" lookup actually
            # queries by. That mismatch meant this transcript-based record
            # was orphaned: saved, but unreachable by anything that later
            # asks for it. session.userdata["customer_call"] (populated from
            # room metadata in session.py) has the real values.
            call_meta = userdata.get("customer_call") or {}
            self._call_id = call_meta.get("call_id") or self.ctx.room.name
            customer_phone = call_meta.get("customer_phone", "")
            if customer_phone:
                self.caller = customer_phone
            self._is_customer_call = True

        logger.info("── call started ── caller=%s room=%s", self.caller, self.ctx.room.name)

        @session.on("conversation_item_added")
        def on_item(ev) -> None:
            item = ev.item
            if not isinstance(item, ChatMessage):
                return
            if item.role not in ("user", "assistant"):
                return
            text = item.text_content
            if not text:
                return
            from app.voicebot.processors.transcript_filter import is_raw_tool_token

            if item.role == "assistant" and is_raw_tool_token(text):
                logger.info("conversation skip raw tool token text=%s", text[:48])
                return
            userdata = session.userdata if isinstance(session.userdata, dict) else {}
            speaker = self._speaker_for_role(userdata, item.role)
            self.append_labeled_turn(
                text,
                speaker=speaker,
                role=item.role,
                ts=ev.created_at or time.time(),
            )
            if not userdata:
                return
            from app.voicebot.processors import context_store, pending_action

            if item.role == "user":
                context_store.set_last_driver_utterance(userdata, text)
            if item.role == "assistant":
                context_store.match_callable_trip_by_text(userdata, text)
                bot_lang = userdata.get("lang", "vn")
                pending_action.infer_from_bot_line(text, userdata, lang=bot_lang)

    async def _build_and_save_record(self) -> str:
        """Generates the transcript-based summary, saves the full record to
        call-logger, and returns the summary that was actually saved. Shared
        by finish() and finish_and_get_summary() — see the latter for why a
        caller would want the summary back before the job/room is fully torn
        down."""
        ended_at    = datetime.now(timezone.utc).isoformat()
        started_ts  = datetime.fromisoformat(self.started_at.replace("Z", "+00:00")).timestamp()
        ended_ts    = datetime.fromisoformat(ended_at.replace("Z", "+00:00")).timestamp()

        record = {
            "call_id":          self._call_id,
            "caller":           self.caller,
            "started_at":       self.started_at,
            "ended_at":         ended_at,
            "duration_seconds": int(ended_ts - started_ts),
            "turns":            self.turns,
            "summary":          await self._generate_summary(),
        }
        metrics = session_metrics.current()
        if metrics is not None:
            record["mode"] = metrics.mode
            record["metrics"] = metrics.snapshot()

        logger.info(
            "── call ended ── caller=%s turns=%d duration=%ds",
            self.caller, len(self.turns), record["duration_seconds"],
        )
        if record["summary"]:
            logger.info("  [summary] %s", record["summary"])

        # log_label must be the actual call_id being saved, NOT the bare
        # room name — for isolated (custcall) calls these differ (self._call_id
        # is room+sip_identity, e.g. "custcall-xxx-sip_identity", set in
        # attach() from room metadata), so logging the room name here made the
        # "[saved]" log line print a value that didn't exist as a key in
        # DynamoDB at all — looked like a saved-but-unfindable record when
        # cross-checking, when the save had actually succeeded correctly.
        await self._post_record(record, log_label=self._call_id)
        self._finished = True
        return record["summary"]

    async def finish(self) -> None:
        if self._finished:
            return
        await self._build_and_save_record()

    async def finish_and_get_summary(self) -> str:
        """Isolated (background) calls only: saves the record EARLY (right
        when the call itself ends, not later at job teardown — see
        session.py's finally: block, which is often several seconds after
        this) and returns the summary that was actually written.

        Root cause this fixes: the driver used to be told a summary the LLM
        itself composed in the moment (via end_customer_call's `summary`
        argument) — confirmed wrong in production (said "customer didn't
        answer" right after a real 58s conversation had just happened,
        because the LLM got confused by the trailing silence-check nudge).
        Meanwhile the record actually saved to DynamoDB via finish() used the
        transcript-based summary and was correct — just arrived too late and
        wasn't what got spoken. Callers should use THIS method's return value
        for whatever they tell the driver, so what's said always matches
        what call-logger holds under this exact call_id, not a separate,
        possibly-wrong value the live conversation happened to produce.
        """
        return await self._build_and_save_record()

    async def save_subcall(
        self,
        *,
        call_id: str,
        caller: str,
        mode: str,
        turns_from: int,
        summary: str,
    ) -> None:
        """Persists an in-room agent/bridge sub-call (customer, contact, or
        custom-number — see customer_call.py/contact_call.py/custom_call.py)
        as its OWN call-logger record.

        These never get a dedicated room/job the way background calls do —
        the SIP leg is dialed straight into the driver's own room, so
        without this call its turns would only ever surface merged into
        (and mislabeled as part of) the driver's own end-of-session record,
        whenever that eventually gets saved. Reuses the summary already
        generated by the handback flow (see handback.py::store_call_summary)
        instead of asking the LLM to summarize the same turns a second time.
        """
        sub_turns = self.turns[turns_from:]
        if not sub_turns:
            return

        record = {
            "call_id":          call_id or f"{self.ctx.room.name}-{turns_from}",
            "caller":           caller or self.caller,
            "started_at":       datetime.fromtimestamp(sub_turns[0]["ts"], tz=timezone.utc).isoformat(),
            "ended_at":         datetime.fromtimestamp(sub_turns[-1]["ts"], tz=timezone.utc).isoformat(),
            "duration_seconds": int(sub_turns[-1]["ts"] - sub_turns[0]["ts"]),
            "turns":            sub_turns,
            "summary":          summary,
            # Customer leg inside the driver's session: its quality numbers are
            # already part of the driver session's metrics, so none here.
            "mode":             f"customer_{mode}" if mode else "customer_call",
        }

        logger.info(
            "── sub-call ended ── mode=%s caller=%s turns=%d duration=%ds",
            mode, record["caller"], len(sub_turns), record["duration_seconds"],
        )

        await self._post_record(record, log_label=record["call_id"])

    async def _post_record(self, record: dict, *, log_label: str) -> None:
        s = get_settings()
        record.setdefault("stt_provider", s.stt_provider)
        record.setdefault("llm_provider", s.llm_provider)
        record.setdefault("llm_model", s.llm_model)
        # call-logger's DynamoDB table has TTL enabled on this exact attribute
        # name (see infra/call-records-service/sam.yaml) — without it, records never
        # expire despite the infra being configured to expire them.
        if s.call_record_ttl_days > 0:
            record.setdefault("ttl", int(time.time()) + s.call_record_ttl_days * 86400)

        if not s.call_logger_url:
            # No DynamoDB write is even possible here — dump the full record
            # (not just "not saved") so the transcript+summary is at least
            # recoverable from the log instead of gone with no trace.
            logger.error(
                "CALL_LOGGER_URL not set — call record NOT saved to DynamoDB | "
                "call_id=%s | full record: %s",
                log_label,
                json.dumps(record, ensure_ascii=False),
            )
            dev_event("call_logger", ok=False, call_id=log_label, error="CALL_LOGGER_URL_unset")
            return

        attempts = len(_POST_RECORD_RETRY_DELAYS_SECONDS) + 1
        last_exc: Exception | None = None
        for attempt in range(1, attempts + 1):
            try:
                async with httpx.AsyncClient(timeout=10) as client:
                    r = await client.post(
                        f"{s.call_logger_url}/api/v1/records",
                        json=record,
                        headers=auth_headers(),
                    )
                    r.raise_for_status()
                logger.info(
                    "  [saved] call_id=%s attempt=%d/%d turns=%d",
                    log_label, attempt, attempts, len(record.get("turns", [])),
                )
                dev_event(
                    "call_logger",
                    call_id=log_label,
                    attempt=attempt,
                    turns=len(record.get("turns", [])),
                )
                return
            except httpx.ConnectError as exc:
                last_exc = exc
                logger.warning(
                    "call-logger unreachable at %s (attempt %d/%d) | call_id=%s",
                    s.call_logger_url, attempt, attempts, log_label,
                )
            except httpx.HTTPStatusError as exc:
                last_exc = exc
                logger.warning(
                    "call-logger rejected record (attempt %d/%d) | call_id=%s status=%s body=%s",
                    attempt, attempts, log_label, exc.response.status_code, exc.response.text[:200],
                )
            except Exception as exc:
                last_exc = exc
                logger.warning(
                    "failed to save call record (attempt %d/%d) | call_id=%s",
                    attempt, attempts, log_label, exc_info=True,
                )

            if attempt <= len(_POST_RECORD_RETRY_DELAYS_SECONDS):
                await asyncio.sleep(_POST_RECORD_RETRY_DELAYS_SECONDS[attempt - 1])

        # Every attempt failed — the transcript+summary would otherwise be
        # lost with no way to recover it. Dump the full record at ERROR level
        # so it's at least visible/greppable in the logs.
        logger.error(
            "call-logger save FAILED after %d attempts — record lost from DynamoDB | "
            "call_id=%s | full record: %s",
            attempts, log_label, json.dumps(record, ensure_ascii=False),
            exc_info=last_exc,
        )
        dev_event(
            "call_logger",
            ok=False,
            call_id=log_label,
            attempts=attempts,
            error=type(last_exc).__name__ if last_exc else "unknown",
            detail=str(last_exc) if last_exc else None,
        )

    async def generate_summary(self) -> str:
        """Public entry point — also used mid-call by session.py's isolated
        (custcall) silence-timeout handler, to produce an honest,
        transcript-based summary instead of a generic "couldn't reach the
        customer" message when a real conversation actually happened before
        the call went silent."""
        return await self._generate_summary()

    async def _generate_summary(self) -> str:
        if not self.turns:
            return "Không có nội dung hội thoại."

        s = get_settings()
        # Isolated (custcall) rooms: the "user" role here is the CUSTOMER
        # talking to the AI on the driver's behalf, not the driver — using
        # "Tài xế" as the label (and describing the conversation as
        # driver<->AI in the prompt below) was actively wrong for these,
        # producing summaries that misattributed or confused who said what.
        other_label = "Khách" if self._is_customer_call else "Tài xế"
        speaker_labels = {
            "driver": "Tài xế",
            "ai": "Bot",
            "customer": "Khách",
        }
        transcript = "\n".join(
            f"{speaker_labels.get(t.get('speaker', ''), other_label if t['role'] == 'user' else 'Bot')}: {t['text']}"
            for t in self.turns
        )

        if self._is_customer_call:
            system_prompt = (
                "Tóm tắt cuộc gọi sau giữa trợ lý AI (gọi thay mặt tài xế) và khách hàng, "
                "bằng tiếng Việt. Nêu rõ: chủ đề chính, khách đã trả lời/xác nhận gì, kết quả "
                "cuộc gọi. Tối đa 3 câu ngắn gọn."
            )
        else:
            system_prompt = (
                "Tóm tắt cuộc hội thoại sau giữa tài xế và trợ lý AI bằng tiếng Việt. "
                "Nêu rõ: chủ đề chính, yêu cầu của tài xế, kết quả thực hiện. "
                "Tối đa 3 câu ngắn gọn."
            )

        try:
            from openai import AsyncOpenAI
            client = AsyncOpenAI(api_key=s.openai_api_key)
            resp = await client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": transcript},
                ],
                max_tokens=200,
            )
            return resp.choices[0].message.content or ""
        except Exception:
            logger.error("summary generation failed", exc_info=True)
            return ""
