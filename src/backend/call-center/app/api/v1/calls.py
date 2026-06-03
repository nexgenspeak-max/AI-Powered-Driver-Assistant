from functools import lru_cache

from fastapi import APIRouter, Depends, Form, Query
from fastapi.responses import Response
from pydantic import BaseModel
from twilio.twiml.voice_response import Gather, VoiceResponse

from app.services import twilio_monitor
from app.services.call_service import CallService

router = APIRouter(prefix="/calls", tags=["calls"])


@lru_cache
def get_call_service() -> CallService:
    return CallService()


# ─────────────────────────────────────────────
# INBOUND — someone calls your Twilio number
# ─────────────────────────────────────────────

def _log_twilio_form(source: str, **fields: str) -> None:
    twilio_monitor.log_event(source, {k: v for k, v in fields.items() if v != ""})


@router.post("/inbound/webhook")
async def inbound_webhook(
    CallSid: str = Form(...),
    From: str = Form(...),
    To: str = Form(...),
):
    """Twilio calls this webhook when someone dials your Twilio number."""
    _log_twilio_form("inbound_webhook", CallSid=CallSid, From=From, To=To, CallStatus="ringing")

    response = VoiceResponse()
    response.say(
        "Xin chào, đây là trợ lý AI dành cho tài xế. Vui lòng chờ một chút.",
        language="vi-VN",
    )
    response.record(
        action="/api/v1/calls/inbound/recorded",
        recording_status_callback="/api/v1/calls/inbound/recording-status",
        timeout=10,
        transcribe=True,
        transcribe_callback="/api/v1/calls/inbound/transcription",
    )
    return Response(content=str(response), media_type="application/xml")


@router.post("/inbound/recorded")
async def inbound_recorded(
    CallSid: str = Form(...),
    RecordingUrl: str = Form(default=""),
    RecordingDuration: str = Form(default=""),
):
    """Called after the recording finishes."""
    print(f"[Inbound] Recording done: {CallSid} | url={RecordingUrl} | dur={RecordingDuration}s")

    response = VoiceResponse()
    response.say("Cuộc gọi đã được ghi lại. Cảm ơn bạn!", language="vi-VN")
    response.hangup()
    return Response(content=str(response), media_type="application/xml")


@router.post("/inbound/recording-status")
async def inbound_recording_status(
    CallSid: str = Form(...),
    RecordingStatus: str = Form(default=""),
    RecordingUrl: str = Form(default=""),
):
    print(f"[Inbound] Recording status: {CallSid} | {RecordingStatus} | {RecordingUrl}")
    return {"status": "ok"}


@router.post("/inbound/transcription")
async def inbound_transcription(
    CallSid: str = Form(...),
    TranscriptionText: str = Form(default=""),
    TranscriptionStatus: str = Form(default=""),
):
    """Twilio sends the transcription here when it's ready."""
    print(f"[Inbound] Transcription [{TranscriptionStatus}]: {TranscriptionText}")
    # TODO Step 4: send transcript to GPT-4o for summary
    return {"status": "ok"}


@router.post("/inbound/status")
async def inbound_status(
    CallSid: str = Form(...),
    CallStatus: str = Form(...),
    Duration: str = Form(default=""),
    From: str = Form(default=""),
    To: str = Form(default=""),
):
    _log_twilio_form(
        "inbound_status",
        CallSid=CallSid,
        CallStatus=CallStatus,
        Duration=Duration,
        From=From,
        To=To,
    )
    return {"status": "ok"}


# ─────────────────────────────────────────────
# OUTBOUND — system calls a driver
# ─────────────────────────────────────────────

@router.post("/outbound/twiml")
async def outbound_twiml(
    CallSid: str = Form(...),
    To: str = Form(...),
):
    """TwiML script the driver hears when they pick up the outbound call."""
    response = VoiceResponse()
    response.say(
        "Xin chào tài xế! Đây là thông báo từ hệ thống quản lý chuyến xe. "
        "Bạn có chuyến đón khách trong 15 phút nữa.",
        language="vi-VN",
    )
    response.pause(length=1)
    response.say(
        "Bấm phím 1 để xác nhận chuyến đi. Bấm phím 2 để từ chối.",
        language="vi-VN",
    )

    gather = Gather(
        num_digits=1,
        action="/api/v1/calls/outbound/gather",
        method="POST",
        timeout=10,
    )
    response.append(gather)

    # Fallback if driver doesn't press anything
    response.say("Không có phản hồi. Kết thúc cuộc gọi.", language="vi-VN")
    response.hangup()
    return Response(content=str(response), media_type="application/xml")


@router.post("/outbound/gather")
async def outbound_gather(
    CallSid: str = Form(...),
    Digits: str = Form(default=""),
):
    """Handle driver's keypress response."""
    print(f"[Outbound] Gather: {CallSid} | Digits={Digits}")

    response = VoiceResponse()
    if Digits == "1":
        response.say("Đã xác nhận chuyến đi. Cảm ơn tài xế!", language="vi-VN")
        # TODO Step 5: update trip status to confirmed in DB
    elif Digits == "2":
        response.say("Đã từ chối chuyến đi. Hẹn gặp lại!", language="vi-VN")
        # TODO Step 5: update trip status to rejected in DB
    else:
        response.say("Lựa chọn không hợp lệ. Kết thúc cuộc gọi.", language="vi-VN")

    response.hangup()
    return Response(content=str(response), media_type="application/xml")


@router.post("/outbound/status")
async def outbound_status(
    CallSid: str = Form(...),
    CallStatus: str = Form(...),
    To: str = Form(...),
    Duration: str = Form(default=""),
    From: str = Form(default=""),
):
    _log_twilio_form(
        "outbound_status",
        CallSid=CallSid,
        CallStatus=CallStatus,
        To=To,
        From=From,
        Duration=Duration,
    )
    return {"status": "ok"}


# ─────────────────────────────────────────────
# REST — trigger / inspect calls via HTTP
# ─────────────────────────────────────────────

class DialRequest(BaseModel):
    to_number: str


@router.post("/outbound/dial")
async def dial(body: DialRequest, svc: CallService = Depends(get_call_service)):
    """Trigger an outbound call to a driver's phone number."""
    if not body.to_number:
        return {"error": "to_number is required"}
    call_sid = svc.make_outbound_call(body.to_number)
    return {"call_sid": call_sid, "status": "initiated"}


@router.get("/status/{call_sid}")
async def get_status(call_sid: str, svc: CallService = Depends(get_call_service)):
    """Get the status of any call by SID."""
    return svc.get_call_status(call_sid)


@router.get("/recent")
async def list_recent(
    limit: int = Query(default=20, le=100),
    svc: CallService = Depends(get_call_service),
):
    """List recent calls from Twilio (live API)."""
    return svc.list_recent_calls(limit=limit)


@router.get("/twilio")
async def list_twilio_calls(
    limit: int = Query(default=50, le=100),
    direction: str = Query(default="", description="inbound | outbound-api | outbound-dial"),
    status: str = Query(default="", description="queued | ringing | completed | failed | ..."),
    svc: CallService = Depends(get_call_service),
):
    """Pull full call log from Twilio — use for monitoring and debugging."""
    return {
        "calls": svc.list_calls(
            limit=limit,
            direction=direction or None,
            status=status or None,
        ),
        "count": limit,
    }


@router.get("/events")
async def list_local_events(
    limit: int = Query(default=200, le=1000),
    call_sid: str = Query(default=""),
):
    """
    Webhook + dial events captured locally (data/twilio_events.jsonl).
    Shows initiated → ringing → answered → completed for each CallSid.
    """
    events = twilio_monitor.read_events(
        limit=limit,
        call_sid=call_sid or None,
    )
    return {"events": events, "count": len(events)}


@router.get("/monitor/{call_sid}")
async def monitor_call(
    call_sid: str,
    svc: CallService = Depends(get_call_service),
):
    """Twilio live status + local webhook trail for one call."""
    try:
        live = svc.get_call_status(call_sid)
    except Exception as exc:
        live = {"error": str(exc)}
    events = twilio_monitor.read_events(limit=500, call_sid=call_sid)
    return {"call_sid": call_sid, "twilio": live, "events": events}
