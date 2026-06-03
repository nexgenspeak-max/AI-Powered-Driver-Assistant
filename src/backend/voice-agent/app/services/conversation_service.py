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

_ROOM_RE = re.compile(r"^driver-(\d+)-\d+$")


class ConversationService:
    def __init__(self, ctx: JobContext) -> None:
        self.ctx = ctx
        self.turns: list[dict] = []
        self.started_at = datetime.now(timezone.utc).isoformat()

        m = _ROOM_RE.match(ctx.room.name)
        self.caller = m.group(1) if m else ctx.room.name.split("-")[1] if "-" in ctx.room.name else "unknown"

    def attach(self, session: AgentSession) -> None:
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
        s = get_settings()
        ended_at    = datetime.now(timezone.utc).isoformat()
        started_ts  = datetime.fromisoformat(self.started_at.replace("Z", "+00:00")).timestamp()
        ended_ts    = datetime.fromisoformat(ended_at.replace("Z", "+00:00")).timestamp()

        record = {
            "call_id":          self.ctx.room.name,
            "caller":           self.caller,
            "started_at":       self.started_at,
            "ended_at":         ended_at,
            "duration_seconds": int(ended_ts - started_ts),
            "turns":            self.turns,
            "summary":          await self._generate_summary(),
            "stt_provider":     s.stt_provider,
            "llm_provider":     s.llm_provider,
            "llm_model":        s.llm_model,
        }

        logger.info(
            "── call ended ── caller=%s turns=%d duration=%ds",
            self.caller, len(self.turns), record["duration_seconds"],
        )
        if record["summary"]:
            logger.info("  [summary] %s", record["summary"])

        if not s.call_logger_url:
            logger.warning("CALL_LOGGER_URL not set — call record not saved")
            return

        try:
            async with httpx.AsyncClient(timeout=10) as client:
                r = await client.post(
                    f"{s.call_logger_url}/api/v1/records", json=record
                )
                r.raise_for_status()
                logger.info("  [saved] call_id=%s", self.ctx.room.name)
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

    async def _generate_summary(self) -> str:
        if not self.turns:
            return "Không có nội dung hội thoại."

        s = get_settings()
        transcript = "\n".join(
            f"{'Tài xế' if t['role'] == 'user' else 'Bot'}: {t['text']}"
            for t in self.turns
        )

        try:
            from openai import AsyncOpenAI
            client = AsyncOpenAI(api_key=s.openai_api_key)
            resp = await client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "Tóm tắt cuộc hội thoại sau giữa tài xế và trợ lý AI bằng tiếng Việt. "
                            "Nêu rõ: chủ đề chính, yêu cầu của tài xế, kết quả thực hiện. "
                            "Tối đa 3 câu ngắn gọn."
                        ),
                    },
                    {"role": "user", "content": transcript},
                ],
                max_tokens=200,
            )
            return resp.choices[0].message.content or ""
        except Exception:
            logger.error("summary generation failed", exc_info=True)
            return ""
