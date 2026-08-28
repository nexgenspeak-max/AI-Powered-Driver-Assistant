"""Bridge mode — driver speaks directly with customer in the same LiveKit room."""
import logging

from livekit.agents import Agent

from app.voicebot.prompts.bridge_call import build_bridge_instructions
from app.voicebot.speech_text_fix import SpeechTextFixMixin, pronunciations_for_lang
from app.voicebot.tools.bridge_call_tools import end_bridge_call

logger = logging.getLogger("voice-agent.bridge_call_agent")


class BridgeCallAgent(SpeechTextFixMixin, Agent):
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

    def _speech_pronunciations(self) -> list[tuple[str, str]]:
        return pronunciations_for_lang(self._lang)

    def _speech_lang(self) -> str:
        return self._lang

    async def on_enter(self) -> None:
        from app.voicebot.processors.bridge_timeout import schedule_bridge_timeout
        from app.voicebot.processors.handback import enter_bridge_listen_mode
        from app.voicebot.processors.sip_call_watch import wait_for_sip_pickup

        logger.info("BridgeCallAgent active | customer=%s", self._customer_name)
        # No greeting spoken here anymore — the full bridge_greeting script
        # (connecting + "talk directly, I'll stay silent, say the wake
        # phrase or wait for hangup when done") was already said in full
        # *before* dialing (see customer_call.py/custom_call.py's
        # _pre_dial_announcement), so the driver already knows everything by
        # the time the callee picks up. The AI has nothing left to say.
        await wait_for_sip_pickup(self.session.userdata)
        enter_bridge_listen_mode(self.session)
        schedule_bridge_timeout(self.session, self.session.userdata)
