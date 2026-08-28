"""Vietnamese driver and customer voice agents."""
import logging
from datetime import datetime, timedelta, timezone
from livekit.agents import Agent

from app.voicebot.vn.system_instructions import INBOUND_PROMPT, CUSTOMER_SUPPORT_PROMPT
from app.voicebot.vn.constants import GREETING_INBOUND, GREETING_OUTBOUND_PREFIX, GREETING_CUSTOMER
from app.voicebot.vn.tools_mapping import TOOLS_MAPPING_PROMPT
from app.voicebot.vn.pronunciations import PRONUNCIATIONS
from app.voicebot.speech_text_fix import SpeechTextFixMixin
from app.voicebot.prompts.outbound import build_outbound_prompt

from app.voicebot.vn.tools.check_upcoming_trips       import check_upcoming_trips
from app.voicebot.vn.tools.refresh_latest_data        import refresh_latest_data
from app.voicebot.vn.tools.get_current_trip_info      import get_current_trip_info
from app.voicebot.vn.tools.suggest_next_stop          import suggest_next_stop
from app.voicebot.vn.tools.get_optimal_route          import get_optimal_route
from app.voicebot.vn.tools.get_trip_traffic           import get_trip_traffic
from app.voicebot.vn.tools.update_trip_status         import update_trip_status
from app.voicebot.vn.tools.call_customer              import call_customer
from app.voicebot.vn.tools.call_custom_number         import call_custom_number
from app.voicebot.vn.tools.confirm_call_custom_number import confirm_call_custom_number
from app.voicebot.vn.tools.find_contact               import find_contact
from app.voicebot.vn.tools.select_contact_match       import select_contact_match
from app.voicebot.vn.tools.confirm_contact_call       import confirm_contact_call
from app.voicebot.vn.tools.get_customer_location      import get_customer_location
from app.voicebot.vn.tools.confirm_trip_with_customer import confirm_trip_with_customer
from app.voicebot.vn.tools.send_sms_to_customer        import send_sms_to_customer
from app.voicebot.vn.tools.send_sms_to_custom_number   import send_sms_to_custom_number
from app.voicebot.vn.tools.confirm_send_sms_to_custom_number import confirm_send_sms_to_custom_number
from app.voicebot.vn.tools.find_contact_to_message     import find_contact_to_message
from app.voicebot.vn.tools.select_contact_match_for_sms import select_contact_match_for_sms
from app.voicebot.vn.tools.confirm_send_sms_to_contact import confirm_send_sms_to_contact
from app.voicebot.vn.tools.summarize_last_call        import summarize_last_call
from app.voicebot.vn.tools.check_customer_call_status import check_customer_call_status
from app.voicebot.vn.tools.create_reminder            import create_reminder
from app.voicebot.vn.tools.request_cancel_trip        import request_cancel_trip
from app.voicebot.vn.tools.confirm_cancel_trip        import confirm_cancel_trip
from app.voicebot.vn.tools.confirm_trip               import confirm_trip
from app.voicebot.vn.tools.reject_trip                import reject_trip
from app.voicebot.vn.tools.book_trip                  import book_trip
from app.voicebot.vn.tools.get_my_trip                import get_my_trip
from app.voicebot.vn.tools.request_cancel_my_trip     import request_cancel_my_trip
from app.voicebot.vn.tools.confirm_cancel_my_trip     import confirm_cancel_my_trip
from app.voicebot.vn.tools.get_driver_eta             import get_driver_eta
from app.voicebot.vn.tools.call_driver                import call_driver
from app.voicebot.vn.tools.get_today_earnings         import get_today_earnings
from app.voicebot.vn.tools.get_driver_stats           import get_driver_stats
from app.voicebot.vn.tools.get_bonus_info             import get_bonus_info
from app.voicebot.vn.tools.report_customer_no_show    import report_customer_no_show
from app.voicebot.vn.tools.report_trip_issue          import report_trip_issue
from app.voicebot.vn.tools.extend_wait_time           import extend_wait_time
from app.voicebot.vn.tools.set_driver_status          import set_driver_status
from app.voicebot.vn.tools.answer_app_faq             import answer_app_faq
from app.voicebot.vn.tools.end_conversation           import end_conversation

logger = logging.getLogger("voice-agent.vn.agent")

_VN_TZ = timezone(timedelta(hours=7))


def _current_time_hint() -> str:
    now = datetime.now(_VN_TZ)
    return f"\n\nTHỜI ĐIỂM HIỆN TẠI: {now.strftime('%H:%M ngày %d/%m/%Y')} (giờ Việt Nam)."


def _registered_phone_hint(customer_phone: str) -> str:
    if not customer_phone:
        return ""
    return f"\n\nSỐ ĐIỆN THOẠI ĐÃ ĐĂNG KÝ TÀI KHOẢN CỦA KHÁCH: {customer_phone}"

_DRIVER_INBOUND_TOOLS = [
    # Trip management
    check_upcoming_trips,
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
    get_driver_stats,
    get_bonus_info,
    # Availability
    set_driver_status,
    # App playbook / FAQ (RAG)
    answer_app_faq,
    # Ending the call
    end_conversation,
]

_DRIVER_OUTBOUND_TOOLS = [confirm_trip, reject_trip]

_CUSTOMER_TOOLS = [
    book_trip, get_my_trip, request_cancel_my_trip, confirm_cancel_my_trip,
    get_driver_eta, call_driver, answer_app_faq,
]


class DriverAgent(SpeechTextFixMixin, Agent):
    """
    Handles both inbound (driver opens app) and outbound (system notifies driver) modes.
    All responses are in Vietnamese.
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
        proactive_nudges: list[dict] | None = None,
    ) -> None:
        self._trip            = trip
        self._driver_phone    = driver_phone
        self._resume_summary  = resume_summary
        self._proactive_nudge = proactive_nudge
        # `proactive_nudges` (plural) is the multi-nudge form — trip-service can
        # hand over both the 1km and 200m nudge in one session now. Falls back
        # to wrapping the singular so every existing caller keeps working.
        self._proactive_nudges = proactive_nudges or (
            [proactive_nudge] if proactive_nudge else []
        )

        if trip:
            instructions = build_outbound_prompt(trip, lang="vi") + "\n" + TOOLS_MAPPING_PROMPT
            tools        = _DRIVER_OUTBOUND_TOOLS
        else:
            # proactive_nudge sessions (ask-before-calling-customer,
            # suggest-next-stop, ...) still need the FULL inbound toolset —
            # only `trip` truthy switches to the 2-tool outbound set above.
            hint = f"\n\n{context_hint}" if context_hint else ""
            instructions = INBOUND_PROMPT + hint + "\n" + TOOLS_MAPPING_PROMPT
            tools        = _DRIVER_INBOUND_TOOLS

        super().__init__(instructions=instructions, tools=tools)

    async def on_enter(self) -> None:
        if self._resume_summary:
            await self.session.say(
                f"Cuộc gọi với khách đã kết thúc. {self._resume_summary}",
                allow_interruptions=False,
            )
            return
        if not self._trip and self._proactive_nudges:
            from app.voicebot.processors.nudge import speak_nudges

            await speak_nudges(
                self.session, self._proactive_nudges,
                lang="vi", userdata=self.session.userdata,
            )
            # A nudge session was opened FOR these nudges. If none of them had
            # anything to say (e.g. suggest_next_stop with no rankable stop),
            # stay quiet and let the silence tracker close the session — do NOT
            # fall through to the generic "tôi giúp được gì" greeting, which
            # made an empty nudge look like the assistant randomly rang up.
            return
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


class CustomerAgent(SpeechTextFixMixin, Agent):
    """Handles inbound voice sessions from Vietnamese-speaking customers."""

    def _speech_pronunciations(self) -> list[tuple[str, str]]:
        return PRONUNCIATIONS

    def __init__(self, customer_phone: str = "", resume_summary: str = "") -> None:
        self._customer_phone = customer_phone
        self._resume_summary = resume_summary
        super().__init__(
            instructions=(
                CUSTOMER_SUPPORT_PROMPT
                + "\n"
                + TOOLS_MAPPING_PROMPT
                + _current_time_hint()
                + _registered_phone_hint(customer_phone)
            ),
            tools=_CUSTOMER_TOOLS,
        )

    async def on_enter(self) -> None:
        if self._resume_summary:
            await self.session.say(
                f"Cuộc gọi với tài xế đã kết thúc. {self._resume_summary}",
                allow_interruptions=False,
            )
            return
        await self.session.say(GREETING_CUSTOMER, allow_interruptions=False)
