"""CustomerCallAgent — in-room (agent mode) or isolated room (background mode)."""
import logging

from livekit.agents import Agent

from app.voicebot.prompts.customer_call import build_customer_call_opening, build_customer_call_prompt
from app.voicebot.processors.prompt_trace_mixin import PromptTraceMixin
from app.voicebot.speech_text_fix import SpeechTextFixMixin, pronunciations_for_lang
from app.voicebot.tools.customer_call_tools import (
    answer_customer_faq,
    end_customer_call,
    record_customer_request,
    transfer_to_driver,
)

logger = logging.getLogger("llm-orchestrator.customer_call_agent")


class CustomerCallAgent(PromptTraceMixin, SpeechTextFixMixin, Agent):
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
            trip=trip,
            isolated=isolated,
            custom_message=custom_message,
        )
        super().__init__(
            instructions=instructions,
            tools=[
                answer_customer_faq,
                record_customer_request,
                end_customer_call,
                transfer_to_driver,
            ],
        )

    def _speech_pronunciations(self) -> list[tuple[str, str]]:
        return pronunciations_for_lang(self._lang)

    def _speech_lang(self) -> str:
        return self._lang

    async def on_enter(self) -> None:
        logger.info("CustomerCallAgent active | lang=%s isolated=%s", self._lang, self._isolated)
        if self._isolated:
            await self._run_isolated_answer_flow()
            return

        from app.voicebot.processors.sip_call_watch import (
            cancel_no_answer_watch,
            teardown_unanswered_call,
            wait_for_sip_pickup,
        )

        answered = await wait_for_sip_pickup(self.session.userdata)
        if not answered:
            logger.info("agent-mode call: pickup not confirmed — tearing down unanswered dial")
            await teardown_unanswered_call(self.session, self.session.userdata)
            return

        cancel_no_answer_watch(self.session.userdata)

        # Agent mode: driver listens live — keep SilenceTracker paused until handback.
        # Isolated (background) calls need the tracker for post-answer silence handling.
        if self._isolated:
            tracker = self.session.userdata.get("_silence_tracker")
            if tracker:
                tracker.resume()

        # Marks "ring/dial time is over, this is genuine pickup" — gates
        # session.py's agent_state_changed handler so it only starts the
        # "customer isn't responding" clock (_agent_call_quiet_since) from
        # here onward, never during ringing. Mirrors _isolated_call_answered
        # below, same reasoning.
        self.session.userdata["_agent_call_answered"] = True
        await self._speak_opening_if_needed()

    def _customer_spoke(self) -> bool:
        return bool(self.session.userdata.get("_customer_spoke"))

    async def _run_isolated_answer_flow(self) -> None:
        """Wait for SIP pickup, then speak the canned opening if the customer
        has not already started talking. SilenceTracker owns hang-up after that."""
        from app.voicebot.processors.sip_call_watch import (
            cancel_no_answer_watch,
            teardown_unanswered_call,
            wait_for_sip_pickup,
        )

        answered = await wait_for_sip_pickup(self.session.userdata)
        if not answered:
            logger.info("isolated call: pickup not confirmed — tearing down unanswered dial")
            await teardown_unanswered_call(self.session, self.session.userdata)
            return

        cancel_no_answer_watch(self.session.userdata)
        self.session.userdata["_isolated_call_answered"] = True
        tracker = self.session.userdata.get("_silence_tracker")
        if tracker:
            tracker.resume()
        await self._speak_opening_if_needed()

    async def _speak_opening_if_needed(self) -> None:
        """First audio after confirmed pickup — scripted TTS, not generate_reply.

        A second asyncio.sleep here used to stack on wait_for_sip_pickup's
        post_answer_delay (3s+3s of dead air after the customer already
        answered). Outbound: the caller speaks first; skip if they already
        said something during the ear-to-phone beat.
        """
        if self._customer_spoke():
            return
        purpose = build_customer_call_opening(
            lang=self._lang,
            pickup_address=self._trip.get("pickup_address", ""),
            trip_id=self._trip.get("trip_id", ""),
            custom_message=self._custom_message,
        )
        logger.info("customer call | speaking opening after pickup")
        await self.session.say(purpose, allow_interruptions=True)
