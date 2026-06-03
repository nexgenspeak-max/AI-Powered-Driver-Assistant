import logging
from twilio.rest import Client

from app.core.config import get_settings
from app.services import twilio_monitor

logger = logging.getLogger("call-center.calls")


class CallService:
    def __init__(self):
        settings = get_settings()
        self.client = Client(settings.twilio_account_sid, settings.twilio_auth_token)
        self.from_number = settings.twilio_phone_number
        self.base_url = settings.base_url

    def make_outbound_call(self, to_number: str) -> str:
        call = self.client.calls.create(
            to=to_number,
            from_=self.from_number,
            url=f"{self.base_url}/api/v1/calls/outbound/twiml",
            status_callback=f"{self.base_url}/api/v1/calls/outbound/status",
            status_callback_method="POST",
            status_callback_event=["initiated", "ringing", "answered", "completed"],
        )
        logger.info("Outbound call initiated: %s → %s", call.sid, to_number)
        twilio_monitor.log_event(
            "api_dial",
            {
                "CallSid": call.sid,
                "To": to_number,
                "From": self.from_number,
                "CallStatus": call.status,
                "direction": "outbound-api",
            },
        )
        return call.sid

    @staticmethod
    def _call_to_dict(call) -> dict:
        # Twilio SDK: `from_` on list items, `_from` on some fetched instances
        from_number = getattr(call, "from_", None) or getattr(call, "_from", None)
        return {
            "sid": call.sid,
            "to": call.to,
            "from": from_number,
            "status": call.status,
            "direction": call.direction,
            "duration": call.duration,
            "start_time": str(call.start_time) if call.start_time else None,
            "end_time": str(call.end_time) if call.end_time else None,
            "price": call.price,
            "answered_by": getattr(call, "answered_by", None),
        }

    def get_call_status(self, call_sid: str) -> dict:
        call = self.client.calls(call_sid).fetch()
        return self._call_to_dict(call)

    def list_calls(
        self,
        limit: int = 50,
        *,
        direction: str | None = None,
        status: str | None = None,
    ) -> list[dict]:
        """Fetch call history directly from Twilio REST API."""
        kwargs: dict = {"limit": min(limit, 100)}
        if direction:
            kwargs["direction"] = direction
        if status:
            kwargs["status"] = status
        calls = self.client.calls.list(**kwargs)
        return [self._call_to_dict(c) for c in calls]

    def end_call(self, call_sid: str) -> None:
        self.client.calls(call_sid).update(status="completed")

    def list_recent_calls(self, limit: int = 20) -> list:
        return self.list_calls(limit=limit)
