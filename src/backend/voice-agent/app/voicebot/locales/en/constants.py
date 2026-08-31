"""English-specific strings: greetings, labels, error messages."""

from app.voicebot.prompts.concise_driver import CONVERSATIONAL_LLM_EN

GREETING_CONNECT_FILLER = "Hello, how can I help you?"
GREETING_AFTER_PREFETCH = "How can I help you?"
GREETING_INBOUND = "Hello! I'm your AI driving assistant. How can I help you?"
GREETING_OUTBOUND_PREFIX = "Hello! This is the driver assistant system."
GREETING_CUSTOMER = (
    "Hello! I'm the AI customer support assistant. "
    "I can help you check on your ride or any related issues. "
    "How can I help you today?"
)

CONVERSATIONAL_LLM_INSTRUCTIONS = CONVERSATIONAL_LLM_EN

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
ERR_NO_PENDING_REFRESH  = "There's nothing pending to refresh."
ERR_NO_CANCELLABLE      = "No trips available to cancel right now."
ERR_CUSTOMER_CANCEL_FAIL = "Unable to cancel the trip right now. Please try again."
ERR_ETA_UNCONFIRMED     = "The driver hasn't confirmed the trip yet. Please wait a moment."
ERR_INVALID_CUSTOM_PHONE  = "That phone number doesn't sound valid. Please read the number again."
ERR_CUSTOM_CALL_LIMIT     = "You've used all custom-number calls for this session. Try again in a new session."
ERR_NO_PENDING_CUSTOM_CALL = "No phone number is waiting for confirmation. Please say the number to call first."
ERR_CONTACT_RPC_FAILED     = "Can't access your phone contacts right now. Please try again later."
ERR_NO_PENDING_CONTACT_CALL = "No contact call is waiting for confirmation."
ERR_INVALID_CUSTOM_SMS_PHONE = "That phone number doesn't sound valid. Please read the number again."
ERR_NO_PENDING_CUSTOM_SMS   = "No text message is waiting to send. Please say the number and message first."
ERR_NO_PENDING_CONTACT_SMS  = "No contact text message is waiting for confirmation."
ERR_SMS_SEND_FAILED         = "Unable to send the text message right now. Please try again."
