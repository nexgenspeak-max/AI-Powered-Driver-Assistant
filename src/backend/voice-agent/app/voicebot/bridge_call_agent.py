"""Bridge mode — driver speaks directly with customer in the same LiveKit room."""
import logging

from livekit.agents import Agent

from app.voicebot.prompts.bridge_call import bridge_greeting, build_bridge_instructions
from app.voicebot.tools.bridge_call_tools import end_bridge_call

logger = logging.getLogger("voice-agent.bridge_call_agent")


class BridgeCallAgent(Agent):
    """
    Activated when call_customer(mode='bridge').
    Customer joins via SIP; agent output is muted but STT stays on for driver wake phrases.
    """

    def __init__(self, *, lang: str, customer_name: str) -> None:
        self._lang = lang
        self._customer_name = customer_name
        super().__init__(
            instructions=build_bridge_instructions(lang),
            tools=[end_bridge_call],
        )

    async def on_enter(self) -> None:
        from app.voicebot.processors.bridge_timeout import schedule_bridge_timeout
        from app.voicebot.processors.handback import enter_bridge_listen_mode

        msg = bridge_greeting(self._lang, self._customer_name)
        logger.info("BridgeCallAgent active | customer=%s", self._customer_name)
        await self.session.say(msg, allow_interruptions=False)
        enter_bridge_listen_mode(self.session)
        schedule_bridge_timeout(self.session, self.session.userdata)
