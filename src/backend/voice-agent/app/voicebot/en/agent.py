"""English driver and customer voice agents."""
import logging
from livekit.agents import Agent

from app.voicebot.en.system_instructions import INBOUND_PROMPT, CUSTOMER_SUPPORT_PROMPT
from app.voicebot.en.constants import GREETING_INBOUND, GREETING_OUTBOUND_PREFIX, GREETING_CUSTOMER
from app.voicebot.en.tools_mapping import TOOLS_MAPPING_PROMPT
from app.voicebot.en.pronunciations import PRONUNCIATIONS
from app.voicebot.speech_text_fix import SpeechTextFixMixin
from app.voicebot.prompts.outbound import build_outbound_prompt
from app.voicebot.processors.nudge import build_nudge_message
from app.voicebot.processors import context_store

from app.voicebot.en.tools.check_upcoming_trips       import check_upcoming_trips
from app.voicebot.en.tools.get_current_trip_info      import get_current_trip_info
from app.voicebot.en.tools.suggest_next_stop          import suggest_next_stop
from app.voicebot.en.tools.get_optimal_route          import get_optimal_route
from app.voicebot.en.tools.get_trip_traffic           import get_trip_traffic
from app.voicebot.en.tools.update_trip_status         import update_trip_status
from app.voicebot.en.tools.call_customer              import call_customer
from app.voicebot.en.tools.get_customer_location      import get_customer_location
from app.voicebot.en.tools.confirm_trip_with_customer import confirm_trip_with_customer
from app.voicebot.en.tools.summarize_last_call        import summarize_last_call
from app.voicebot.en.tools.check_customer_call_status import check_customer_call_status
from app.voicebot.en.tools.create_reminder            import create_reminder
from app.voicebot.en.tools.request_cancel_trip        import request_cancel_trip
from app.voicebot.en.tools.confirm_cancel_trip        import confirm_cancel_trip
from app.voicebot.en.tools.confirm_trip               import confirm_trip
from app.voicebot.en.tools.reject_trip                import reject_trip
from app.voicebot.en.tools.get_my_trip                import get_my_trip
from app.voicebot.en.tools.cancel_my_trip             import cancel_my_trip
from app.voicebot.en.tools.get_driver_eta             import get_driver_eta
from app.voicebot.en.tools.get_today_earnings         import get_today_earnings
from app.voicebot.en.tools.get_driver_stats           import get_driver_stats
from app.voicebot.en.tools.get_bonus_info             import get_bonus_info
from app.voicebot.en.tools.report_customer_no_show    import report_customer_no_show
from app.voicebot.en.tools.report_trip_issue          import report_trip_issue
from app.voicebot.en.tools.extend_wait_time           import extend_wait_time
from app.voicebot.en.tools.set_driver_status          import set_driver_status
from app.voicebot.en.tools.answer_app_faq             import answer_app_faq
from app.voicebot.en.tools.end_call                   import end_call
from app.voicebot.en.tools.refresh_latest_data        import refresh_latest_data

logger = logging.getLogger("voice-agent.en.agent")

_DRIVER_INBOUND_TOOLS = [
    # Trip management
    check_upcoming_trips,
    refresh_latest_data,
    get_current_trip_info,
    suggest_next_stop,
    get_optimal_route,
    get_trip_traffic,
    update_trip_status,
    request_cancel_trip,
    confirm_cancel_trip,
    # Customer communication
    call_customer,
    get_customer_location,
    confirm_trip_with_customer,
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
    get_driver_stats,
    get_bonus_info,
    # Availability
    set_driver_status,
    # App playbook / FAQ (RAG)
    answer_app_faq,
    # Ending the call
    end_call,
]

_DRIVER_OUTBOUND_TOOLS = [confirm_trip, reject_trip]

_CUSTOMER_TOOLS = [get_my_trip, cancel_my_trip, get_driver_eta, answer_app_faq]


class DriverAgent(SpeechTextFixMixin, Agent):
    """
    Handles both inbound and outbound driver sessions.
    All responses are in English.
    """

    def _speech_pronunciations(self) -> list[tuple[str, str]]:
        return PRONUNCIATIONS

    def __init__(
        self,
        trip: dict | None = None,
        driver_phone: str = "",
        context_hint: str = "",
        resume_summary: str = "",
        proactive_nudge: dict | None = None,
    ) -> None:
        self._trip            = trip
        self._driver_phone    = driver_phone
        self._resume_summary  = resume_summary
        self._proactive_nudge = proactive_nudge

        if trip:
            instructions = build_outbound_prompt(trip, lang="en") + "\n" + TOOLS_MAPPING_PROMPT
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
        if not self._trip and self._proactive_nudge:
            nudge_kind = self._proactive_nudge.get("nudge_kind", "")
            payload = {k: v for k, v in self._proactive_nudge.items() if k != "nudge_kind"}
            text = await build_nudge_message(nudge_kind, payload, lang="en", userdata=self.session.userdata)
            if text:
                # suggest_next_stop sets this itself (see next_stop.py) —
                # payload's related_trip_id means something else for that
                # kind (trip to EXCLUDE from ranking), see session.py's
                # identical guard for the full reasoning.
                if nudge_kind != "suggest_next_stop":
                    related_trip_id = payload.get("related_trip_id", "")
                    if related_trip_id:
                        context_store.set_last_nudge_trip(self.session.userdata, related_trip_id)
                await self.session.say(text, allow_interruptions=False)
                return
            # Unrecognized nudge_kind — fall through to the normal inbound
            # greeting rather than saying nothing at all.
        msg = self._build_outbound_greeting() if self._trip else GREETING_INBOUND
        await self.session.say(msg, allow_interruptions=False)

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


class CustomerAgent(SpeechTextFixMixin, Agent):
    """Handles inbound voice sessions from English-speaking customers."""

    def _speech_pronunciations(self) -> list[tuple[str, str]]:
        return PRONUNCIATIONS

    def __init__(self, customer_phone: str = "", resume_summary: str = "") -> None:
        self._customer_phone = customer_phone
        self._resume_summary = resume_summary
        super().__init__(
            instructions=CUSTOMER_SUPPORT_PROMPT + "\n" + TOOLS_MAPPING_PROMPT,
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
