"""
DriverAgent — the LiveKit Agent for the driver assistant.

Business logic is delegated to tool mixins (app/tools/).
This class is intentionally thin: lifecycle + greeting only.
"""
import logging
from livekit.agents import Agent, RunContext

from app.agent.prompts import INBOUND_PROMPT, build_outbound_prompt
from app.tools.registry import InboundToolsMixin, OutboundToolsMixin

logger = logging.getLogger("voice-agent.agent")


class DriverAgent(InboundToolsMixin, Agent):
    """
    Handles both modes:

    inbound  — driver opens the Digital Human screen and talks to the AI.
               All tools (trip, customer, call, reminder) are available.

    outbound — trip-service dispatches the agent to notify the driver about a
               new trip. Only confirm_trip / reject_trip are used.
    """

    def __init__(
        self,
        trip: dict | None = None,
        driver_phone: str = "",
    ) -> None:
        self._trip = trip
        self._driver_phone = driver_phone
        self._pending_cancel_trip_id: str | None = None

        prompt = build_outbound_prompt(trip) if trip else INBOUND_PROMPT
        super().__init__(instructions=prompt)

    # ── Lifecycle ─────────────────────────────────────────────────────────────

    async def on_enter(self) -> None:
        """Speak the opening greeting as soon as the agent joins the room."""
        if self._trip:
            msg = self._build_outbound_greeting()
        else:
            msg = "Xin chào! Tôi là trợ lý AI của bạn. Tôi có thể giúp gì cho bạn?"

        await self.session.say(msg, allow_interruptions=False)

    # ── Private helpers ───────────────────────────────────────────────────────

    def _build_outbound_greeting(self) -> str:
        t = self._trip or {}
        customer = t.get("customer_name", "khách hàng")
        pickup   = t.get("pickup_address", "")
        dropoff  = t.get("dropoff_address", "")
        eta      = t.get("eta_minutes", "")
        traffic  = t.get("traffic_note", "")

        msg = (
            f"Xin chào! Hệ thống trợ lý tài xế. "
            f"Có chuyến mới: đón {customer} tại {pickup}, đến {dropoff}."
        )
        if eta:
            msg += f" Ước tính {eta} phút."
        if traffic:
            msg += f" {traffic}."
        msg += " Anh/chị có nhận chuyến này không?"
        return msg
