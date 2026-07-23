"""
EnrollAgent — records a driver's/customer's voiceprint for the wake-word
speaker-verification gate. Fully scripted (no LLM turns): says each prompt,
captures raw audio directly from the participant via speaker_verify.py, then
disconnects. See app/voicebot/processors/speaker_verify.py for the actual
capture/embedding/save logic.
"""
import logging
from livekit import rtc
from livekit.agents import Agent

from app.voicebot.processors import speaker_verify

logger = logging.getLogger("voice-agent.enroll-agent")


class EnrollAgent(Agent):
    def __init__(self, identity: str, account_id: str | None, room: rtc.Room) -> None:
        self._identity = identity
        self._account_id = account_id
        self._room = room
        super().__init__(
            instructions=(
                "Bạn hướng dẫn người dùng đăng ký giọng nói. Mọi lời thoại đã được "
                "viết sẵn qua session.say — không tự tạo câu trả lời nào khác."
            )
        )

    async def on_enter(self) -> None:
        if not self._account_id:
            await self.session.say("Không tìm thấy tài khoản, vui lòng thử lại sau.", allow_interruptions=False)
            await self._room.disconnect()
            return

        try:
            await speaker_verify.run_enrollment(self.session, self._room, self._identity, self._account_id)
        except Exception:
            logger.exception("enrollment failed | identity=%s", self._identity)
            await self.session.say("Có lỗi xảy ra, vui lòng thử lại sau.", allow_interruptions=False)
        finally:
            await self._room.disconnect()
