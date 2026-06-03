import logging
from livekit.agents import RunContext, function_tool
from app.voicebot.en.tools_definition import raw_schema
from app.voicebot.en.constants import ERR_CANNOT_CALL, ERR_NO_ACTIVE_DRIVER
from app.services import backend_api

logger = logging.getLogger("voice-agent.en.tools.call_customer")


@function_tool(raw_schema=raw_schema["call_customer"])
async def call_customer(raw_arguments: dict, context: RunContext) -> str:
    mode         = raw_arguments.get("mode", "bridge")
    driver_phone = context.userdata["driver_phone"]
    try:
        current = await backend_api.get_current_trip(driver_phone)
    except Exception:
        logger.error("call_customer — get_current_trip failed", exc_info=True)
        return ERR_CANNOT_CALL
    if not current:
        return ERR_NO_ACTIVE_DRIVER

    name  = current.get("customer_name", "the customer")
    phone = current.get("customer_phone", "")
    if not phone:
        return f"No phone number found for {name}."

    try:
        result = await backend_api.start_call(
            driver_id=driver_phone,
            customer_id=phone,
            trip_id=current.get("trip_id", ""),
            phone_number=phone,
            mode=mode,
        )
    except Exception:
        logger.error("call_customer — start_call failed", exc_info=True)
        return (
            f"Unable to connect the call to {name} right now. "
            "Check that trip-service (:8002) and call-center (:8000) are running."
        )

    dialed = result.get("dialed_number", phone)
    note   = result.get("override_note") or ""
    suffix = f" {note}" if note else ""

    if mode == "agent":
        return (
            f"Calling {name} at {dialed}.{suffix} "
            "The AI is speaking with the customer — please wait. "
            "I'll summarize the call for you once it's done."
        )
    return (
        f"Call started to {name} at {dialed}.{suffix} "
        "The customer's phone is ringing — please wait for the connection."
    )
