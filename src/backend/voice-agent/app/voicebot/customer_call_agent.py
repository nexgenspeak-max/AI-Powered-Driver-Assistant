"""CustomerCallAgent — in-room (agent mode) or isolated room (background mode)."""
import logging

from livekit.agents import Agent

from app.voicebot.prompts.customer_call import build_customer_call_prompt
from app.voicebot.speech_text_fix import SpeechTextFixMixin, pronunciations_for_lang
from app.voicebot.tools.customer_call_tools import end_customer_call

logger = logging.getLogger("voice-agent.customer_call_agent")


class CustomerCallAgent(SpeechTextFixMixin, Agent):
    """
    - mode=agent: handoff in driver room; driver listens live.
    - mode=background: separate custcall-* room; driver keeps DriverAgent elsewhere.
    """

    def __init__(
        self,
        *,
        lang: str,
        trip: dict,
        customer_name: str,
        driver_name: str = "",
        isolated: bool = False,
    ) -> None:
        self._lang = lang
        self._isolated = isolated
        instructions = build_customer_call_prompt(
            lang=lang,
            customer_name=customer_name,
            driver_name=driver_name,
            pickup_address=trip.get("pickup_address", ""),
            trip_id=trip.get("trip_id", ""),
            isolated=isolated,
        )
        super().__init__(instructions=instructions, tools=[end_customer_call])

    def _speech_pronunciations(self) -> list[tuple[str, str]]:
        return pronunciations_for_lang(self._lang)

    async def on_enter(self) -> None:
        if self._isolated:
            if self._lang == "en":
                hint = (
                    "You are calling the customer in a dedicated call room. "
                    "The driver is not on this line. Greet the customer when they answer."
                )
            else:
                hint = (
                    "Bạn đang gọi khách trong phòng riêng. Tài xế không ở cuộc gọi này. "
                    "Chào khách khi họ nghe máy."
                )
        elif self._lang == "en":
            hint = (
                "The customer is being dialed into this room. "
                "When they answer, greet them and explain the driver asked you to call. "
                "The driver can hear everything — stay brief."
            )
        else:
            hint = (
                "Khách đang được kết nối vào cuộc gọi. "
                "Khi khách nghe máy, chào và giải thích tài xế nhờ bạn gọi. "
                "Tài xế nghe trực tiếp — nói ngắn gọn."
            )
        logger.info("CustomerCallAgent active | lang=%s isolated=%s", self._lang, self._isolated)
        await self.session.generate_reply(instructions=hint)
