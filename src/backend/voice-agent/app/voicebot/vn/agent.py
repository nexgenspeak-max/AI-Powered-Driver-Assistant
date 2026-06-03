"""Vietnamese driver and customer voice agents."""
import logging
from livekit.agents import Agent

from app.voicebot.vn.system_instructions import INBOUND_PROMPT, CUSTOMER_SUPPORT_PROMPT, build_outbound_prompt
from app.voicebot.vn.constants import GREETING_INBOUND, GREETING_OUTBOUND_PREFIX, GREETING_CUSTOMER
from app.voicebot.vn.tools_mapping import TOOLS_MAPPING_PROMPT

from app.voicebot.vn.tools.check_upcoming_trips       import check_upcoming_trips
from app.voicebot.vn.tools.update_trip_status         import update_trip_status
from app.voicebot.vn.tools.call_customer              import call_customer
from app.voicebot.vn.tools.get_customer_location      import get_customer_location
from app.voicebot.vn.tools.confirm_trip_with_customer import confirm_trip_with_customer
from app.voicebot.vn.tools.summarize_last_call        import summarize_last_call
from app.voicebot.vn.tools.create_reminder            import create_reminder
from app.voicebot.vn.tools.request_cancel_trip        import request_cancel_trip
from app.voicebot.vn.tools.confirm_cancel_trip        import confirm_cancel_trip
from app.voicebot.vn.tools.confirm_trip               import confirm_trip
from app.voicebot.vn.tools.reject_trip                import reject_trip
from app.voicebot.vn.tools.get_my_trip                import get_my_trip
from app.voicebot.vn.tools.cancel_my_trip             import cancel_my_trip
from app.voicebot.vn.tools.get_driver_eta             import get_driver_eta
from app.voicebot.vn.tools.get_today_earnings         import get_today_earnings
from app.voicebot.vn.tools.get_driver_stats           import get_driver_stats
from app.voicebot.vn.tools.get_bonus_info             import get_bonus_info
from app.voicebot.vn.tools.report_customer_no_show    import report_customer_no_show
from app.voicebot.vn.tools.report_trip_issue          import report_trip_issue
from app.voicebot.vn.tools.extend_wait_time           import extend_wait_time
from app.voicebot.vn.tools.set_driver_status          import set_driver_status

logger = logging.getLogger("voice-agent.vn.agent")

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
    Handles both inbound (driver opens app) and outbound (system notifies driver) modes.
    All responses are in Vietnamese. No mixin inheritance — tools are passed explicitly.
    """

    def __init__(self, trip: dict | None = None, driver_phone: str = "") -> None:
        self._trip        = trip
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
        customer = t.get("customer_name", "khách hàng")
        pickup   = t.get("pickup_address", "")
        dropoff  = t.get("dropoff_address", "")
        eta      = t.get("eta_minutes", "")
        traffic  = t.get("traffic_note", "")
        msg = f"{GREETING_OUTBOUND_PREFIX} Có chuyến mới: đón {customer} tại {pickup}, đến {dropoff}."
        if eta:
            msg += f" Ước tính {eta} phút."
        if traffic:
            msg += f" {traffic}."
        msg += " Anh/chị có nhận chuyến này không?"
        return msg


class CustomerAgent(Agent):
    """Handles inbound voice sessions from Vietnamese-speaking customers."""

    def __init__(self, customer_phone: str = "") -> None:
        self._customer_phone = customer_phone
        super().__init__(
            instructions=CUSTOMER_SUPPORT_PROMPT + "\n" + TOOLS_MAPPING_PROMPT,
            tools=_CUSTOMER_TOOLS,
        )

    async def on_enter(self) -> None:
        await self.session.say(GREETING_CUSTOMER, allow_interruptions=False)
