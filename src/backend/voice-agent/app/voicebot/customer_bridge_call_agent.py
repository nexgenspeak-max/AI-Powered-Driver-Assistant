"""Bridge mode — customer speaks directly with the driver in the same LiveKit room."""
import logging

from livekit.agents import Agent

from app.voicebot.prompts.customer_bridge_call import (
    bridge_greeting_to_driver,
    build_customer_bridge_instructions,
)
from app.voicebot.speech_text_fix import SpeechTextFixMixin, pronunciations_for_lang
from app.voicebot.tools.customer_bridge_call_tools import end_customer_bridge_call
from app.voicebot.processors.handback import enter_bridge_listen_mode

logger = logging.getLogger("voice-agent.customer_bridge_call_agent")


class CustomerBridgeCallAgent(SpeechTextFixMixin, Agent):
    """
    Activated when call_driver() dials the driver into the customer's room.
    Driver joins via SIP; agent output is muted but STT stays on for the customer's wake phrase.
    """

    def __init__(self, *, lang: str) -> None:
        self._lang = lang
        super().__init__(
            instructions=build_customer_bridge_instructions(lang),
            tools=[end_customer_bridge_call],
        )

    def _speech_pronunciations(self) -> list[tuple[str, str]]:
        return pronunciations_for_lang(self._lang)

    async def on_enter(self) -> None:
        from app.voicebot.processors.customer_bridge_timeout import schedule_customer_bridge_timeout

        msg = bridge_greeting_to_driver(self._lang)
        logger.info("CustomerBridgeCallAgent active")
        await self.session.say(msg, allow_interruptions=False)
        enter_bridge_listen_mode(self.session)
        schedule_customer_bridge_timeout(self.session, self.session.userdata)
