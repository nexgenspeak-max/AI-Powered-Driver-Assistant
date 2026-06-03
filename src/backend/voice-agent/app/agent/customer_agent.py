"""
CustomerAgent — LiveKit Agent for the customer-facing support line.

Tools: get_my_trip, cancel_my_trip, get_driver_eta
"""
import logging
from livekit.agents import Agent, RunContext
from app.agent.customer_prompts import CUSTOMER_SUPPORT_PROMPT
from app.tools.registry import CustomerAgentMixin

logger = logging.getLogger("voice-agent.customer_agent")


class CustomerAgent(CustomerAgentMixin, Agent):
    """
    Handles inbound voice sessions from customers asking about their trip.
    The customer phone is extracted from the room name: customer-{phone}-{ts}
    """

    def __init__(self, customer_phone: str = "") -> None:
        self._customer_phone = customer_phone
        super().__init__(instructions=CUSTOMER_SUPPORT_PROMPT)

    async def on_enter(self) -> None:
        await self.session.say(
            "Xin chào! Tôi là trợ lý AI hỗ trợ khách hàng. "
            "Tôi có thể giúp bạn kiểm tra chuyến xe hoặc các vấn đề liên quan. "
            "Bạn cần hỗ trợ gì ạ?",
            allow_interruptions=False,
        )
