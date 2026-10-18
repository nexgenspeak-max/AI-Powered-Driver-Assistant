"""English driver and customer voice agents."""
import logging
from livekit.agents import Agent

from app.voicebot.locales.en.system_instructions import INBOUND_PROMPT, CUSTOMER_SUPPORT_PROMPT
from app.voicebot.locales.en.constants import (
    GREETING_AFTER_PREFETCH,
    GREETING_CONNECT_FILLER,
    GREETING_OUTBOUND_PREFIX,
    GREETING_CUSTOMER,
)
from app.voicebot.locales.en.tools_mapping import (
    CUSTOMER_TOOLS_MAPPING_PROMPT,
    OUTBOUND_TOOLS_MAPPING_PROMPT,
    TOOLS_MAPPING_PROMPT,
)
from app.voicebot.locales.en.pronunciations import PRONUNCIATIONS
from app.voicebot.speech_text_fix import SpeechTextFixMixin
from app.voicebot.processors import context_store
from app.voicebot.processors.prompt_trace_mixin import PromptTraceMixin
from app.voicebot.processors.spoken_intent import SpokenIntentMixin
from app.voicebot.prompts.outbound import build_outbound_prompt

from app.voicebot.locales.en.tools.check_upcoming_trips       import check_upcoming_trips
from app.voicebot.locales.en.tools.create_walkup_trip         import create_walkup_trip
from app.voicebot.locales.en.tools.get_current_trip_info      import get_current_trip_info
from app.voicebot.locales.en.tools.suggest_next_stop          import suggest_next_stop
from app.voicebot.locales.en.tools.get_optimal_route          import get_optimal_route
from app.voicebot.locales.en.tools.get_trip_traffic           import get_trip_traffic
from app.voicebot.locales.en.tools.update_trip_status         import update_trip_status
from app.voicebot.locales.en.tools.call_customer              import call_customer
from app.voicebot.locales.en.tools.call_custom_number         import call_custom_number
from app.voicebot.locales.en.tools.confirm_call_custom_number import confirm_call_custom_number
from app.voicebot.locales.en.tools.find_contact               import find_contact
from app.voicebot.locales.en.tools.select_contact_match       import select_contact_match
from app.voicebot.locales.en.tools.confirm_contact_call       import confirm_contact_call
from app.voicebot.locales.en.tools.get_customer_location      import get_customer_location
from app.voicebot.locales.en.tools.confirm_trip_with_customer import confirm_trip_with_customer
from app.voicebot.locales.en.tools.send_sms_to_customer        import send_sms_to_customer
from app.voicebot.locales.en.tools.send_sms_to_custom_number   import send_sms_to_custom_number
from app.voicebot.locales.en.tools.confirm_send_sms_to_custom_number import confirm_send_sms_to_custom_number
from app.voicebot.locales.en.tools.find_contact_to_message     import find_contact_to_message
from app.voicebot.locales.en.tools.select_contact_match_for_sms import select_contact_match_for_sms
from app.voicebot.locales.en.tools.confirm_send_sms_to_contact import confirm_send_sms_to_contact
from app.voicebot.locales.en.tools.summarize_last_call        import summarize_last_call
from app.voicebot.locales.en.tools.check_customer_call_status import check_customer_call_status
from app.voicebot.locales.en.tools.create_reminder            import create_reminder
from app.voicebot.locales.en.tools.request_cancel_trip        import request_cancel_trip
from app.voicebot.locales.en.tools.confirm_cancel_trip        import confirm_cancel_trip
from app.voicebot.locales.en.tools.confirm_trip               import confirm_trip
from app.voicebot.locales.en.tools.reject_trip                import reject_trip
from app.voicebot.locales.en.tools.get_my_trip                import get_my_trip
from app.voicebot.locales.en.tools.cancel_my_trip             import cancel_my_trip
from app.voicebot.locales.en.tools.get_driver_eta             import get_driver_eta
from app.voicebot.locales.en.tools.get_today_earnings         import get_today_earnings
from app.voicebot.locales.en.tools.get_earnings_summary       import get_earnings_summary
from app.voicebot.locales.en.tools.check_trip_history         import check_trip_history
from app.voicebot.locales.en.tools.get_driver_stats           import get_driver_stats
from app.voicebot.locales.en.tools.report_customer_no_show    import report_customer_no_show
from app.voicebot.locales.en.tools.report_trip_issue          import report_trip_issue
from app.voicebot.locales.en.tools.extend_wait_time           import extend_wait_time
from app.voicebot.locales.en.tools.set_driver_status          import set_driver_status
from app.voicebot.locales.en.tools.answer_app_faq             import answer_app_faq
from app.voicebot.locales.en.tools.end_conversation           import end_conversation
from app.voicebot.locales.en.tools.refresh_latest_data        import refresh_latest_data

logger = logging.getLogger("llm-orchestrator.en.agent")

_DRIVER_INBOUND_TOOLS = [
    # Trip management
    check_upcoming_trips,
    create_walkup_trip,
    refresh_latest_data,
    get_current_trip_info,
    suggest_next_stop,
    get_optimal_route,
    get_trip_traffic,
    confirm_trip,
    reject_trip,
    update_trip_status,
    request_cancel_trip,
    confirm_cancel_trip,
    # Customer communication
    call_customer,
    call_custom_number,
    confirm_call_custom_number,
    find_contact,
    select_contact_match,
    confirm_contact_call,
    get_customer_location,
    confirm_trip_with_customer,
    send_sms_to_customer,
    send_sms_to_custom_number,
    confirm_send_sms_to_custom_number,
    find_contact_to_message,
    select_contact_match_for_sms,
    confirm_send_sms_to_contact,
    summarize_last_call,
    check_customer_call_status,
    # Productivity
    create_reminder,
    extend_wait_time,
    # Reporting
    report_customer_no_show,
    report_trip_issue,
    # Earnings & profile
    get_today_earnings,
    get_earnings_summary,
    check_trip_history,
    get_driver_stats,
    # Availability
    set_driver_status,
    # App playbook / FAQ (RAG)
    answer_app_faq,
    # Ending the call
    end_conversation,
]

_DRIVER_OUTBOUND_TOOLS = [confirm_trip, reject_trip]

_CUSTOMER_TOOLS = [get_my_trip, cancel_my_trip, get_driver_eta, answer_app_faq]


class DriverAgent(PromptTraceMixin, SpokenIntentMixin, SpeechTextFixMixin, Agent):
    """
    Handles both inbound and outbound driver sessions.
    All responses are in English.
    """

    _spoken_intent_lang = "en"

    def _speech_pronunciations(self) -> list[tuple[str, str]]:
        return PRONUNCIATIONS

    def _speech_lang(self) -> str:
        return "en"

    def __init__(
        self,
        trip: dict | None = None,
        driver_phone: str = "",
        context_hint: str = "",
        resume_summary: str = "",
        proactive_nudge: dict | None = None,
        proactive_nudges: list[dict] | None = None,
    ) -> None:
        self._trip            = trip
        self._driver_phone    = driver_phone
        self._resume_summary  = resume_summary
        self._proactive_nudge = proactive_nudge
        # Multi-nudge form — see the vn/ DriverAgent for the full reasoning.
        self._proactive_nudges = proactive_nudges or (
            [proactive_nudge] if proactive_nudge else []
        )

        if trip:
            instructions = build_outbound_prompt(trip, lang="en") + "\n" + OUTBOUND_TOOLS_MAPPING_PROMPT
            tools        = _DRIVER_OUTBOUND_TOOLS
        else:
            # proactive_nudge sessions still need the FULL inbound toolset —
            # only `trip` truthy switches to the 2-tool outbound set above.
            hint = f"\n\n{context_hint}" if context_hint else ""
            instructions = INBOUND_PROMPT + hint + "\n" + TOOLS_MAPPING_PROMPT
            tools        = _DRIVER_INBOUND_TOOLS

        super().__init__(instructions=instructions, tools=tools)

    async def on_enter(self) -> None:
        if self._resume_summary:
            await self.session.say(
                f"The customer call has ended. {self._resume_summary}",
                allow_interruptions=False,
            )
            return
        if not self._trip and self._proactive_nudges:
            from app.voicebot.processors.nudge import speak_nudges
            from app.voicebot.processors.sip_call_watch import wait_for_in_app_audio_ready

            # Nudge rooms are dispatched before the phone joins — speaking
            # now would read the offer into an empty room.
            await wait_for_in_app_audio_ready(self.session)

            await speak_nudges(
                self.session, self._proactive_nudges,
                lang="en", userdata=self.session.userdata,
            )
            # Opened FOR these nudges — if none rendered, stay quiet and let the
            # silence tracker close it, don't drop into the generic greeting.
            return
        msg = self._build_outbound_greeting() if self._trip else None
        if msg:
            from app.voicebot.processors.sip_call_watch import speak_after_sip_pickup

            await speak_after_sip_pickup(self.session, msg)
            return
        await self._speak_inbound_greeting()

    async def _speak_inbound_greeting(self) -> None:
        """Connect filler first, then help prompt after prefetch."""
        from app.voicebot.processors import prefetch as prefetch_processor
        from app.voicebot.processors.sip_call_watch import speak_after_sip_pickup

        await speak_after_sip_pickup(self.session, GREETING_CONNECT_FILLER)

        userdata = self.session.userdata
        if self._driver_phone and not context_store.has_prefetched_context(userdata):
            await prefetch_processor.run_driver(self.session, self._driver_phone)

        await self.session.say(GREETING_AFTER_PREFETCH, allow_interruptions=True)

    def _build_outbound_greeting(self) -> str:
        t        = self._trip or {}
        customer = t.get("customer_name", "a customer")
        pickup   = t.get("pickup_address", "")
        dropoff  = t.get("dropoff_address", "")
        eta      = t.get("eta_minutes", "")
        traffic  = t.get("traffic_note", "")
        msg = f"{GREETING_OUTBOUND_PREFIX} New trip: pick up {customer} at {pickup}, drop off at {dropoff}."
        if eta:
            msg += f" Estimated {eta} minutes."
        if traffic:
            msg += f" {traffic}."
        msg += " Would you like to accept this trip?"
        return msg


class CustomerAgent(PromptTraceMixin, SpeechTextFixMixin, Agent):
    """Handles inbound voice sessions from English-speaking customers."""

    def _speech_pronunciations(self) -> list[tuple[str, str]]:
        return PRONUNCIATIONS

    def _speech_lang(self) -> str:
        return "en"

    def __init__(self, customer_phone: str = "", resume_summary: str = "") -> None:
        self._customer_phone = customer_phone
        self._resume_summary = resume_summary
        super().__init__(
            instructions=CUSTOMER_SUPPORT_PROMPT + "\n" + CUSTOMER_TOOLS_MAPPING_PROMPT,
            tools=_CUSTOMER_TOOLS,
        )

    async def on_enter(self) -> None:
        if self._resume_summary:
            await self.session.say(
                f"The call with the driver has ended. {self._resume_summary}",
                allow_interruptions=False,
            )
            return
        await self.session.say(GREETING_CUSTOMER, allow_interruptions=False)
