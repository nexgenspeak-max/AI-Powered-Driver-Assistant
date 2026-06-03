"""English-specific strings: greetings, labels, error messages."""

GREETING_INBOUND = "Hello! I'm your AI driving assistant. How can I help you?"
GREETING_OUTBOUND_PREFIX = "Hello! This is the driver assistant system."
GREETING_CUSTOMER = (
    "Hello! I'm the AI customer support assistant. "
    "I can help you check on your ride or any related issues. "
    "How can I help you today?"
)

TRIP_CONFIRMED = "Trip confirmed. Drive safe!"
TRIP_REJECTED  = "Got it. Thank you!"
TRIP_CANCELLED = "Your trip has been cancelled."

STATUS_LABELS = {
    "ARRIVED_PICKUP": "arrived at pickup",
    "PICKED_UP":      "passenger picked up",
    "COMPLETED":      "trip completed",
}

TRIP_STATUS_MAP = {
    "pending":   "looking for a driver",
    "notified":  "driver notified",
    "calling":   "calling driver",
    "confirmed": "driver has accepted the trip",
}

# Error messages
ERR_NO_CURRENT_TRIP   = "You don't have an active trip right now."
ERR_NO_ACTIVE_DRIVER  = "You don't have an active trip to call the customer."
ERR_NO_UPCOMING       = "You don't have any upcoming trips."
ERR_CANNOT_UPDATE     = "Unable to update trip status right now."
ERR_CANNOT_CALL       = "Unable to find customer information right now."
ERR_CANNOT_CANCEL     = "Unable to cancel the trip right now. Please try again."
ERR_CANNOT_REMINDER   = "Unable to set a reminder right now."
ERR_NO_TRIP_REMINDER  = "No trip found to set a reminder for."
ERR_SUMMARY_FAIL      = "Unable to retrieve the call summary right now."
ERR_NO_SUMMARY        = "No recent calls found."
ERR_LOCATION_FAIL     = "Unable to retrieve the customer's location right now."
ERR_NO_LOCATION       = "Customer location not found."
ERR_CONFIRM_FAIL      = "Unable to send confirmation right now. Please try again."
ERR_NO_PENDING_CANCEL = "No pending cancellation request found."
ERR_NO_ACTIVE_CANCEL  = "No active trip to cancel."
ERR_CUSTOMER_TRIP_FAIL  = "Unable to retrieve trip information right now. Please try again."
ERR_NO_CUSTOMER_TRIP    = "You don't have any active trips."
ERR_NO_CANCELLABLE      = "No trips available to cancel right now."
ERR_CUSTOMER_CANCEL_FAIL = "Unable to cancel the trip right now. Please try again."
ERR_ETA_UNCONFIRMED     = "The driver hasn't confirmed the trip yet. Please wait a moment."
