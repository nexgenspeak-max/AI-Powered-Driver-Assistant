"""
ConversationService — records every turn, generates a Vietnamese summary,
and POSTs the call record to call-logger when the session ends.
"""
import logging
import time
import re
from datetime import datetime, timezone

import httpx
from livekit.agents import AgentSession, JobContext
from livekit.agents.llm import ChatMessage

from app.config.settings import get_settings

logger = logging.getLogger("voice-agent.conversation")

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
            self.turns.append({
                "role": item.role,
                "text": text,
                "ts":   ev.created_at or time.time(),
            })
            label = "USER" if item.role == "user" else "BOT "
            logger.info("  [%s] %s", label, text[:120])

    async def finish(self) -> None:
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

        logger.info(
            "── call ended ── caller=%s turns=%d duration=%ds",
            self.caller, len(self.turns), record["duration_seconds"],
        )
        if record["summary"]:
            logger.info("  [summary] %s", record["summary"])

        await self._post_record(record, log_label=self.ctx.room.name)

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

        if not s.call_logger_url:
            logger.warning("CALL_LOGGER_URL not set — call record not saved")
            return

        try:
            async with httpx.AsyncClient(timeout=10) as client:
                r = await client.post(
                    f"{s.call_logger_url}/api/v1/records", json=record
                )
                r.raise_for_status()
                logger.info("  [saved] call_id=%s", log_label)
        except httpx.ConnectError:
            logger.warning(
                "call-logger unreachable at %s — record not saved "
                "(start call-logger on :8001 or set CALL_LOGGER_URL= in env)",
                s.call_logger_url,
            )
        except httpx.HTTPStatusError as exc:
            logger.error(
                "call-logger rejected record: %s %s",
                exc.response.status_code,
                exc.response.text[:200],
            )
        except Exception:
            logger.error("failed to save call record", exc_info=True)

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
        transcript = "\n".join(
            f"{other_label if t['role'] == 'user' else 'Bot'}: {t['text']}"
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
