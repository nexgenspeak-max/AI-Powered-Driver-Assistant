"""English driver and customer voice agents."""
import logging
from livekit.agents import Agent

from app.voicebot.en.system_instructions import INBOUND_PROMPT, CUSTOMER_SUPPORT_PROMPT, build_outbound_prompt
from app.voicebot.en.constants import GREETING_INBOUND, GREETING_OUTBOUND_PREFIX, GREETING_CUSTOMER
from app.voicebot.en.tools_mapping import TOOLS_MAPPING_PROMPT

from app.voicebot.en.tools.check_upcoming_trips       import check_upcoming_trips
from app.voicebot.en.tools.update_trip_status         import update_trip_status
from app.voicebot.en.tools.call_customer              import call_customer
from app.voicebot.en.tools.get_customer_location      import get_customer_location
from app.voicebot.en.tools.confirm_trip_with_customer import confirm_trip_with_customer
from app.voicebot.en.tools.summarize_last_call        import summarize_last_call
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

logger = logging.getLogger("voice-agent.en.agent")

_DRIVER_INBOUND_TOOLS = [
    # Trip management
    check_upcoming_trips,
    update_trip_status,
    request_cancel_trip,
    confirm_cancel_trip,
    # Customer communication
    call_customer,
    get_customer_location,
    confirm_trip_with_customer,
    summarize_last_call,
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
]

_DRIVER_OUTBOUND_TOOLS = [confirm_trip, reject_trip]

_CUSTOMER_TOOLS = [get_my_trip, cancel_my_trip, get_driver_eta]


class DriverAgent(Agent):
    """
    Handles both inbound and outbound driver sessions.
    All responses are in English. No mixin inheritance — tools are passed explicitly.
    """

    def __init__(self, trip: dict | None = None, driver_phone: str = "") -> None:
        self._trip         = trip
        self._driver_phone = driver_phone

        if trip:
            instructions = build_outbound_prompt(trip) + "\n" + TOOLS_MAPPING_PROMPT
            tools        = _DRIVER_OUTBOUND_TOOLS
        else:
            instructions = INBOUND_PROMPT + "\n" + TOOLS_MAPPING_PROMPT
            tools        = _DRIVER_INBOUND_TOOLS

        super().__init__(instructions=instructions, tools=tools)

    async def on_enter(self) -> None:
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


class CustomerAgent(Agent):
    """Handles inbound voice sessions from English-speaking customers."""

    def __init__(self, customer_phone: str = "") -> None:
        self._customer_phone = customer_phone
        super().__init__(
            instructions=CUSTOMER_SUPPORT_PROMPT + "\n" + TOOLS_MAPPING_PROMPT,
            tools=_CUSTOMER_TOOLS,
        )

    async def on_enter(self) -> None:
        await self.session.say(GREETING_CUSTOMER, allow_interruptions=False)
