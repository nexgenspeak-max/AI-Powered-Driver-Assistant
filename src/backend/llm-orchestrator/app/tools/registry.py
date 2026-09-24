"""
Tool registry — MRO-based mixin composition.

Driver (inbound)  → InboundToolsMixin  (trip + customer + call + reminder)
Driver (outbound) → OutboundToolsMixin (confirm/reject only)
Customer          → CustomerAgentMixin (trip status + cancel + ETA)
"""
from app.tools.trip_tools             import TripToolsMixin
from app.tools.customer_tools         import CustomerToolsMixin
from app.tools.call_tools             import CallToolsMixin
from app.tools.reminder_tools         import ReminderToolsMixin
from app.tools.customer_support_tools import CustomerSupportToolsMixin


class InboundToolsMixin(TripToolsMixin, CustomerToolsMixin, CallToolsMixin, ReminderToolsMixin):
    """Full toolkit for inbound driver sessions."""


class OutboundToolsMixin(TripToolsMixin):
    """Minimal toolkit for outbound sessions (confirm or reject only)."""


class CustomerAgentMixin(CustomerSupportToolsMixin):
    """Toolkit for customer-facing voice sessions."""
