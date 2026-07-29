"""CustomerCallAgent — in-room (agent mode) or isolated room (background mode)."""
import asyncio
import logging

from livekit.agents import Agent

from app.voicebot.prompts.customer_call import build_customer_call_prompt
from app.voicebot.speech_text_fix import SpeechTextFixMixin, pronunciations_for_lang
from app.voicebot.tools.customer_call_tools import end_customer_call

logger = logging.getLogger("voice-agent.customer_call_agent")

# Isolated (background) call answer flow — deterministic, timer-driven so it
# can't be short-circuited by the LLM mis-hearing a hallucinated STT
# transcript and hanging up right after the customer says a single word
# (e.g. just "Alô"). Three fixed waits, each one only proceeds if the
# customer still hasn't said anything real (see _customer_spoke in
# session.py's user_input_transcribed/conversation_item_added handlers):
#   1. Up to INITIAL_WAIT_SECONDS for the customer to speak after answering.
#   2. If still silent, state the call's purpose out loud, then wait
#      FOLLOWUP_WAIT_SECONDS for a response.
#   3. If still silent, warn that the call will end, then a final
#      FINAL_WAIT_SECONDS grace period before actually hanging up.
_INITIAL_WAIT_SECONDS = 5.0
_FOLLOWUP_WAIT_SECONDS = 10.0
_FINAL_WAIT_SECONDS = 5.0


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
        custom_message: str = "",
    ) -> None:
        self._lang = lang
        self._isolated = isolated
        self._trip = trip
        self._customer_name = customer_name
        self._driver_name = driver_name
        self._custom_message = custom_message
        instructions = build_customer_call_prompt(
            lang=lang,
            customer_name=customer_name,
            driver_name=driver_name,
            pickup_address=trip.get("pickup_address", ""),
            trip_id=trip.get("trip_id", ""),
            isolated=isolated,
            custom_message=custom_message,
        )
        super().__init__(instructions=instructions, tools=[end_customer_call])

    def _speech_pronunciations(self) -> list[tuple[str, str]]:
        return pronunciations_for_lang(self._lang)

    async def on_enter(self) -> None:
        logger.info("CustomerCallAgent active | lang=%s isolated=%s", self._lang, self._isolated)
        if self._isolated:
            await self._run_isolated_answer_flow()
            return

        if self._custom_message:
            hint = (
                f'The person is being dialed into this room. When they answer, greet them '
                f'briefly, then deliver this message from the driver: "{self._custom_message}" '
                "The driver can hear everything — stay brief."
                if self._lang == "en"
                else (
                    f'Người nhận đang được kết nối vào cuộc gọi. Khi họ nghe máy, chào ngắn gọn '
                    f'rồi truyền đạt đúng nội dung tài xế nhắn: "{self._custom_message}" '
                    "Tài xế nghe trực tiếp — nói ngắn gọn."
                )
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
        await self.session.generate_reply(instructions=hint)

    def _customer_spoke(self) -> bool:
        return bool(self.session.userdata.get("_customer_spoke"))

    async def _run_isolated_answer_flow(self) -> None:
        """Deterministic answer-detection sequence for a background call —
        see the module-level constants' docstring for the exact spec."""
        await asyncio.sleep(_INITIAL_WAIT_SECONDS)
        if self._customer_spoke():
            return  # customer already talking — normal LLM turn-taking takes it from here

        pickup_address = self._trip.get("pickup_address", "")
        if self._lang == "en":
            purpose = (
                f"Hello, this is the driver's assistant calling to confirm your pickup"
                + (f" at {pickup_address}" if pickup_address else "")
                + ". Can you hear me?"
            )
        else:
            purpose = (
                f"Xin chào, tôi là trợ lý của tài xế, gọi để xác nhận đón anh/chị"
                + (f" tại {pickup_address}" if pickup_address else "")
                + ". Anh/chị có nghe rõ không?"
            )
        logger.info("isolated call | %.0fs silence — stating purpose", _INITIAL_WAIT_SECONDS)
        await self.session.say(purpose, allow_interruptions=True)

        await asyncio.sleep(_FOLLOWUP_WAIT_SECONDS)
        if self._customer_spoke():
            return

        warning = (
            "If there's no response, I'll end this call."
            if self._lang == "en"
            else "Nếu không có phản hồi, tôi sẽ kết thúc cuộc gọi."
        )
        logger.info(
            "isolated call | %.0fs total silence — warning before hangup",
            _INITIAL_WAIT_SECONDS + _FOLLOWUP_WAIT_SECONDS,
        )
        await self.session.say(warning, allow_interruptions=True)

        await asyncio.sleep(_FINAL_WAIT_SECONDS)
        if self._customer_spoke():
            return

        # Still silent after the warning — end the call for real and notify
        # the driver, same teardown path as every other isolated-call ending
        # (SIP disconnect, silence-tracker safety net) so the driver's "tóm
        # tắt cuộc gọi" query never gets stuck on status=in_progress.
        from app.voicebot.processors.sip_call_watch import complete_isolated_call

        summary = (
            f"Đã gọi khách {self._customer_name} nhưng không có phản hồi sau khi được thông báo."
            if self._lang != "en"
            else f"Called {self._customer_name} but got no response after the notice."
        )
        total = _INITIAL_WAIT_SECONDS + _FOLLOWUP_WAIT_SECONDS + _FINAL_WAIT_SECONDS
        logger.info("isolated call | %.0fs total silence — ending call | summary=%s", total, summary)
        await complete_isolated_call(self.session, self.session.userdata, summary)
